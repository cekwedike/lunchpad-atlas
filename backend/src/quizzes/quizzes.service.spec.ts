import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { PrismaService } from '../prisma.service';
import { AchievementsService } from '../achievements/achievements.service';
import { PointsService } from '../gamification/points.service';

describe('QuizzesService', () => {
  let service: QuizzesService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    quiz: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    quizQuestion: {
      findMany: jest.fn(),
    },
    quizResponse: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    pointsLog: {
      create: jest.fn(),
    },
    cohortFacilitator: {
      findFirst: jest.fn(),
    },
    guestSession: {
      findFirst: jest.fn(),
    },
  };

  const mockAchievementsService = {
    checkAndAwardAchievements: jest.fn().mockResolvedValue([]),
  };

  const mockPointsService = {
    awardPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AchievementsService, useValue: mockAchievementsService },
        { provide: PointsService, useValue: mockPointsService },
      ],
    }).compile();

    service = module.get<QuizzesService>(QuizzesService);

    mockPointsService.awardPoints.mockResolvedValue({
      awarded: true,
      capped: false,
      monthResetApplied: false,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyQuizzes', () => {
    it('should return empty array when user has no cohort', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: null });

      const result = await service.getMyQuizzes('user-1');

      expect(result).toEqual([]);
    });

    it('should return empty array when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getMyQuizzes('user-1');

      expect(result).toEqual([]);
    });

    it('should return quizzes with correct status OPEN', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 10000);
      const future = new Date(now.getTime() + 10000);

      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-1' });
      const mockQuiz = {
        id: 'quiz-1',
        openAt: past,
        closeAt: future,
        maxAttempts: 3,
        sessions: [],
        _count: { questions: 5 },
      };
      mockPrismaService.quiz.findMany.mockResolvedValue([mockQuiz]);
      mockPrismaService.quizResponse.findMany.mockResolvedValue([]);
      mockPrismaService.quizResponse.groupBy.mockResolvedValue([]);

      const result = await service.getMyQuizzes('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('OPEN');
    });

    it('should return COMPLETED status when user has passed', async () => {
      const now = new Date();
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-1' });
      const mockQuiz = {
        id: 'quiz-1',
        openAt: new Date(now.getTime() - 10000),
        closeAt: new Date(now.getTime() + 10000),
        maxAttempts: 3,
        sessions: [],
        _count: { questions: 5 },
      };
      mockPrismaService.quiz.findMany.mockResolvedValue([mockQuiz]);
      mockPrismaService.quizResponse.findMany.mockResolvedValue([{ quizId: 'quiz-1' }]);
      mockPrismaService.quizResponse.groupBy.mockResolvedValue([]);

      const result = await service.getMyQuizzes('user-1');

      expect(result[0].status).toBe('COMPLETED');
    });

    it('should return LOCKED status when max attempts used', async () => {
      const now = new Date();
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-1' });
      const mockQuiz = {
        id: 'quiz-1',
        openAt: new Date(now.getTime() - 10000),
        closeAt: new Date(now.getTime() + 10000),
        maxAttempts: 2,
        sessions: [],
        _count: { questions: 5 },
      };
      mockPrismaService.quiz.findMany.mockResolvedValue([mockQuiz]);
      mockPrismaService.quizResponse.findMany.mockResolvedValue([]);
      mockPrismaService.quizResponse.groupBy.mockResolvedValue([
        { quizId: 'quiz-1', _count: { id: 2 } },
      ]);

      const result = await service.getMyQuizzes('user-1');

      expect(result[0].status).toBe('LOCKED');
    });

    it('should return UPCOMING status when quiz has not opened yet', async () => {
      const now = new Date();
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-1' });
      const mockQuiz = {
        id: 'quiz-1',
        openAt: new Date(now.getTime() + 100000),
        closeAt: new Date(now.getTime() + 200000),
        maxAttempts: 0,
        sessions: [],
        _count: { questions: 5 },
      };
      mockPrismaService.quiz.findMany.mockResolvedValue([mockQuiz]);
      mockPrismaService.quizResponse.findMany.mockResolvedValue([]);
      mockPrismaService.quizResponse.groupBy.mockResolvedValue([]);

      const result = await service.getMyQuizzes('user-1');

      expect(result[0].status).toBe('UPCOMING');
    });

    it('should return CLOSED status when quiz window has passed', async () => {
      const now = new Date();
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-1' });
      const mockQuiz = {
        id: 'quiz-1',
        openAt: new Date(now.getTime() - 200000),
        closeAt: new Date(now.getTime() - 100000),
        maxAttempts: 0,
        sessions: [],
        _count: { questions: 5 },
      };
      mockPrismaService.quiz.findMany.mockResolvedValue([mockQuiz]);
      mockPrismaService.quizResponse.findMany.mockResolvedValue([]);
      mockPrismaService.quizResponse.groupBy.mockResolvedValue([]);

      const result = await service.getMyQuizzes('user-1');

      expect(result[0].status).toBe('CLOSED');
    });
  });

  describe('getQuiz', () => {
    it('should return quiz when found', async () => {
      const mockQuiz = {
        id: 'quiz-1',
        title: 'Test Quiz',
        cohortId: 'cohort-1',
        sessions: [],
        openAt: null,
        closeAt: null,
      };
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          role: 'FELLOW',
          cohortId: 'cohort-1',
        })
        .mockResolvedValueOnce({ role: 'FELLOW' });

      const result = await service.getQuiz('quiz-1', 'user-1');

      expect(result).toEqual(mockQuiz);
    });

    it('should reject when quiz has not opened yet (non-admin)', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        id: 'quiz-1',
        title: 'Test Quiz',
        cohortId: 'cohort-1',
        sessions: [],
        openAt: new Date(Date.now() + 86400000),
        closeAt: null,
      });
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          role: 'FELLOW',
          cohortId: 'cohort-1',
        })
        .mockResolvedValueOnce({ role: 'FELLOW' });

      await expect(service.getQuiz('quiz-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when quiz not found', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(service.getQuiz('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getQuizQuestions', () => {
    it('should return quiz questions without correct answers', async () => {
      const mockQuestions = [
        { id: 'q-1', quizId: 'quiz-1', question: 'What is 2+2?', options: ['3', '4', '5'], order: 1 },
      ];
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        id: 'quiz-1',
        cohortId: 'cohort-1',
        sessions: [],
        openAt: null,
        closeAt: null,
      });
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          role: 'FELLOW',
          cohortId: 'cohort-1',
        })
        .mockResolvedValueOnce({ role: 'FELLOW' });
      mockPrismaService.quizQuestion.findMany.mockResolvedValue(mockQuestions);

      const result = await service.getQuizQuestions('quiz-1', 'user-1');

      expect(result).toEqual(mockQuestions);
      expect(mockPrismaService.quizQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { quizId: 'quiz-1' },
          orderBy: { order: 'asc' },
        }),
      );
    });
  });

  describe('getQuizAttempts', () => {
    it('should return attempts for user and quiz', async () => {
      const mockAttempts = [
        { id: 'attempt-1', score: 80, passed: true, pointsAwarded: 100, completedAt: new Date() },
      ];
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        id: 'quiz-1',
        cohortId: 'cohort-1',
        sessions: [],
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'FELLOW',
        cohortId: 'cohort-1',
      });
      mockPrismaService.quizResponse.findMany.mockResolvedValue(mockAttempts);

      const result = await service.getQuizAttempts('quiz-1', 'user-1');

      expect(result).toEqual(mockAttempts);
      expect(mockPrismaService.quizResponse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { quizId: 'quiz-1', userId: 'user-1' },
        }),
      );
    });
  });

  describe('submitQuiz', () => {
    const baseQuiz = {
      id: 'quiz-1',
      title: 'Test Quiz',
      cohortId: 'cohort-1',
      sessions: [] as { sessionId: string; session: { cohortId: string } }[],
      passingScore: 70,
      pointValue: 100,
      timeLimit: 30,
      multiplier: 1.0,
      maxAttempts: 3,
      quizType: 'SESSION',
      showCorrectAnswers: false,
      openAt: null as Date | null,
      closeAt: null as Date | null,
    };

    beforeEach(() => {
      mockPrismaService.quizResponse.count.mockReset();
      mockPrismaService.user.findUnique.mockReset();
      mockPrismaService.user.findUnique.mockImplementation(() =>
        Promise.resolve({
          role: 'FELLOW',
          cohortId: 'cohort-1',
        }),
      );
    });

    it('should throw NotFoundException when quiz not found', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(
        service.submitQuiz('nonexistent', 'user-1', { answers: {}, timeTaken: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when max attempts reached', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        ...baseQuiz,
        maxAttempts: 2,
      });
      mockPrismaService.quizResponse.count.mockResolvedValue(2);

      await expect(
        service.submitQuiz('quiz-1', 'user-1', { answers: {}, timeTaken: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quiz is not open yet', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        ...baseQuiz,
        openAt: new Date(Date.now() + 86400000),
      });

      await expect(
        service.submitQuiz('quiz-1', 'user-1', { answers: {}, timeTaken: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when quiz window has closed', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        ...baseQuiz,
        openAt: new Date(Date.now() - 200000),
        closeAt: new Date(Date.now() - 100000),
      });

      await expect(
        service.submitQuiz('quiz-1', 'user-1', { answers: {}, timeTaken: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should submit quiz and return result with FAILED status', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(baseQuiz);
      mockPrismaService.quizResponse.count
        .mockResolvedValueOnce(0) // totalAllAttempts
        .mockResolvedValueOnce(0); // previousPassedAttempts

      const questions = [
        { id: 'q-1', correctAnswer: 'B' },
        { id: 'q-2', correctAnswer: 'C' },
      ];
      mockPrismaService.quizQuestion.findMany.mockResolvedValue(questions);

      const mockResponse = {
        id: 'response-1',
        userId: 'user-1',
        quizId: 'quiz-1',
        score: 0,
        passed: false,
        pointsAwarded: 0,
        timeTaken: 100,
        completedAt: new Date(),
      };
      mockPrismaService.quizResponse.create.mockResolvedValue(mockResponse);

      const dto = {
        answers: { 'q-1': 'A', 'q-2': 'A' }, // both wrong
        timeTaken: 100,
      };

      const result = await service.submitQuiz('quiz-1', 'user-1', dto);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.pointsAwarded).toBe(0);
    });

    it('should submit quiz and award points on first pass', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(baseQuiz);
      mockPrismaService.quizResponse.count
        .mockResolvedValueOnce(0) // totalAllAttempts
        .mockResolvedValueOnce(0); // previousPassedAttempts

      const questions = [{ id: 'q-1', correctAnswer: 'B' }];
      mockPrismaService.quizQuestion.findMany.mockResolvedValue(questions);

      // Mock awardPoints flow (assertUserCanAccessQuiz calls findUnique first)
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          role: 'FELLOW',
          cohortId: 'cohort-1',
        })
        .mockResolvedValue({
          currentMonthPoints: 0,
          monthlyPointsCap: 5000,
          lastPointReset: null,
        });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.pointsLog.create.mockResolvedValue({});

      const mockResponse = {
        id: 'response-1',
        userId: 'user-1',
        quizId: 'quiz-1',
        score: 100,
        passed: true,
        pointsAwarded: 100,
        timeTaken: 60,
        completedAt: new Date(),
      };
      mockPrismaService.quizResponse.create.mockResolvedValue(mockResponse);

      const dto = {
        answers: { 'q-1': 'B' }, // correct
        timeTaken: 60,
      };

      const result = await service.submitQuiz('quiz-1', 'user-1', dto);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should remap and persist answers when client sends only legacy question ids', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(baseQuiz);
      mockPrismaService.quizResponse.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const questions = [
        { id: 'new-1', correctAnswer: 'B' },
        { id: 'new-2', correctAnswer: 'C' },
      ];
      mockPrismaService.quizQuestion.findMany.mockResolvedValue(questions);

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ role: 'FELLOW', cohortId: 'cohort-1' })
        .mockResolvedValue({
          currentMonthPoints: 0,
          monthlyPointsCap: 5000,
          lastPointReset: null,
        });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.pointsLog.create.mockResolvedValue({});

      mockPrismaService.quizResponse.create.mockResolvedValue({
        id: 'response-1',
        userId: 'user-1',
        quizId: 'quiz-1',
        score: 100,
        passed: true,
        pointsAwarded: 200,
        timeTaken: 0,
        completedAt: new Date(),
      });

      const dto = {
        answers: { 'legacy-a': 'B', 'legacy-b': 'C' },
        timeTaken: 0,
      };

      await service.submitQuiz('quiz-1', 'user-1', dto);

      expect(mockPrismaService.quizResponse.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            answers: { 'new-1': 'B', 'new-2': 'C' },
            score: 100,
          }),
        }),
      );
    });

    it('should not award points on second pass attempt', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(baseQuiz);
      mockPrismaService.quizResponse.count
        .mockResolvedValueOnce(1) // totalAllAttempts = 1 (already tried once)
        .mockResolvedValueOnce(1); // previousPassedAttempts = 1 (already passed)

      const questions = [{ id: 'q-1', correctAnswer: 'B' }];
      mockPrismaService.quizQuestion.findMany.mockResolvedValue(questions);

      const mockResponse = {
        id: 'response-2',
        userId: 'user-1',
        quizId: 'quiz-1',
        score: 100,
        passed: true,
        pointsAwarded: 0,
        timeTaken: 60,
        completedAt: new Date(),
      };
      mockPrismaService.quizResponse.create.mockResolvedValue(mockResponse);

      const result = await service.submitQuiz('quiz-1', 'user-1', {
        answers: { 'q-1': 'B' },
        timeTaken: 60,
      });

      expect(result.pointsAwarded).toBe(0);
    });

    it('should check achievements after passing quiz', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(baseQuiz);
      mockPrismaService.quizResponse.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const questions = [{ id: 'q-1', correctAnswer: 'B' }];
      mockPrismaService.quizQuestion.findMany.mockResolvedValue(questions);

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          role: 'FELLOW',
          cohortId: 'cohort-1',
        })
        .mockResolvedValue({
          currentMonthPoints: 0,
          monthlyPointsCap: 5000,
          lastPointReset: null,
        });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.pointsLog.create.mockResolvedValue({});

      const mockResponse = {
        id: 'response-1',
        userId: 'user-1',
        quizId: 'quiz-1',
        score: 100,
        passed: true,
        pointsAwarded: 100,
        timeTaken: 60,
        completedAt: new Date(),
      };
      mockPrismaService.quizResponse.create.mockResolvedValue(mockResponse);

      mockAchievementsService.checkAndAwardAchievements.mockResolvedValue([
        { id: 'ach-1', name: 'Quiz Ace' },
      ]);

      const result = await service.submitQuiz('quiz-1', 'user-1', {
        answers: { 'q-1': 'B' },
        timeTaken: 60,
      });

      expect(mockAchievementsService.checkAndAwardAchievements).toHaveBeenCalledWith('user-1');
      expect(result.newAchievements).toBeDefined();
      expect(result.newAchievements).toHaveLength(1);
    });
  });

  describe('getQuizReview', () => {
    it('should throw NotFoundException when quiz not found', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue(null);

      await expect(service.getQuizReview('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when no attempts found', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        id: 'quiz-1',
        cohortId: 'cohort-1',
        sessions: [],
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'FELLOW',
        cohortId: 'cohort-1',
      });
      mockPrismaService.quizResponse.findFirst.mockResolvedValue(null);

      await expect(service.getQuizReview('quiz-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should return review data with correct answers when showCorrectAnswers is true', async () => {
      const mockQuiz = {
        id: 'quiz-1',
        cohortId: 'cohort-1',
        sessions: [],
        showCorrectAnswers: true,
      };
      const mockAttempt = {
        score: 80,
        passed: true,
        completedAt: new Date(),
        answers: { 'q-1': 'B', 'q-2': 'A' },
      };
      const mockQuestions = [
        { id: 'q-1', question: 'Q1?', options: ['A', 'B'], correctAnswer: 'B', order: 1 },
        { id: 'q-2', question: 'Q2?', options: ['A', 'B'], correctAnswer: 'B', order: 2 },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'FELLOW',
        cohortId: 'cohort-1',
      });
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizResponse.findFirst.mockResolvedValue(mockAttempt);
      mockPrismaService.quizQuestion.findMany.mockResolvedValue(mockQuestions);

      const result = await service.getQuizReview('quiz-1', 'user-1');

      expect(result.showCorrectAnswers).toBe(true);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].isCorrect).toBe(true); // answered B, correct is B
      expect(result.questions[0].correctAnswer).toBe('B');
      expect(result.questions[1].isCorrect).toBe(false); // answered A, correct is B
      expect(result.attempt.score).toBe(80);
    });

    it('should not include correct answers when showCorrectAnswers is false', async () => {
      const mockQuiz = {
        id: 'quiz-1',
        cohortId: 'cohort-1',
        sessions: [],
        showCorrectAnswers: false,
      };
      const mockAttempt = {
        score: 50,
        passed: false,
        completedAt: new Date(),
        answers: { 'q-1': 'A' },
      };
      const mockQuestions = [
        { id: 'q-1', question: 'Q1?', options: ['A', 'B'], correctAnswer: 'B', order: 1 },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'FELLOW',
        cohortId: 'cohort-1',
      });
      mockPrismaService.quiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizResponse.findFirst.mockResolvedValue(mockAttempt);
      mockPrismaService.quizQuestion.findMany.mockResolvedValue(mockQuestions);

      const result = await service.getQuizReview('quiz-1', 'user-1');

      expect(result.showCorrectAnswers).toBe(false);
      expect(result.questions[0]).not.toHaveProperty('correctAnswer');
    });
  });
});
