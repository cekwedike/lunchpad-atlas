import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { QuizzesController } from '../src/quizzes/quizzes.controller';
import { QuizzesService } from '../src/quizzes/quizzes.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { PrismaService } from '../src/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AchievementsService } from '../src/achievements/achievements.service';
import { EmailService } from '../src/email/email.service';

/**
 * E2E tests for the Quizzes endpoints.
 * PrismaService is mocked so no real DB connection is required.
 */
describe('Quizzes (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    cohort: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  const mockQuizzesService = {
    getMyQuizzes: jest.fn(),
    getQuiz: jest.fn(),
    getQuizQuestions: jest.fn(),
    getQuizAttempts: jest.fn(),
    getQuizReview: jest.fn(),
    submitQuiz: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(undefined),
    notifyAdminsUserRegistered: jest.fn().mockResolvedValue(undefined),
  };

  const mockAchievementsService = {
    checkAndAwardAchievements: jest.fn().mockResolvedValue([]),
  };

  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
    sendAccountCreatedEmail: jest.fn().mockResolvedValue(undefined),
  };

  const TEST_JWT_SECRET = 'test-quizzes-e2e-secret';
  const mockUser = {
    id: 'user-test-1',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'FELLOW',
    isSuspended: false,
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [QuizzesController],
      providers: [
        { provide: QuizzesService, useValue: mockQuizzesService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AchievementsService, useValue: mockAchievementsService },
        { provide: EmailService, useValue: mockEmailService },
        AuthService,
        JwtStrategy,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const getAuthToken = (user = mockUser) => {
    return jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  };

  describe('GET /api/v1/quizzes/my-quizzes', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/quizzes/my-quizzes')
        .expect(401);
    });

    it('should return 200 with quiz list when authenticated', async () => {
      const mockQuizzes = [
        {
          id: 'quiz-1',
          title: 'Week 1 Quiz',
          passingScore: 70,
          pointValue: 100,
          status: 'OPEN',
          attemptCount: 0,
        },
      ];

      mockQuizzesService.getMyQuizzes.mockResolvedValue(mockQuizzes);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .get('/api/v1/quizzes/my-quizzes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Week 1 Quiz');
    });

    it('should return 401 with invalid token', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/quizzes/my-quizzes')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('GET /api/v1/quizzes/:id', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/quizzes/quiz-1')
        .expect(401);
    });

    it('should return 200 with quiz details when authenticated', async () => {
      const mockQuiz = {
        id: 'quiz-1',
        title: 'Week 1 Quiz',
        passingScore: 70,
        sessions: [],
      };

      mockQuizzesService.getQuiz.mockResolvedValue(mockQuiz);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .get('/api/v1/quizzes/quiz-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe('quiz-1');
      expect(response.body.title).toBe('Week 1 Quiz');
    });
  });

  describe('POST /api/v1/quizzes/:id/submit', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/quizzes/quiz-1/submit')
        .send({ answers: { 'q-1': 'A' } })
        .expect(401);
    });

    it('should return 201 with submission result when authenticated', async () => {
      const mockResult = {
        id: 'response-1',
        score: 80,
        passed: true,
        pointsAwarded: 100,
        attemptNumber: 1,
        maxAttempts: 3,
        attemptsRemaining: 2,
      };

      mockQuizzesService.submitQuiz.mockResolvedValue(mockResult);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .post('/api/v1/quizzes/quiz-1/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ answers: { 'q-1': 'A', 'q-2': 'B' }, timeTaken: 120 })
        .expect(201);

      expect(response.body.passed).toBe(true);
      expect(response.body.score).toBe(80);
      expect(mockQuizzesService.submitQuiz).toHaveBeenCalledWith(
        'quiz-1',
        mockUser.id,
        expect.objectContaining({ answers: { 'q-1': 'A', 'q-2': 'B' } }),
      );
    });

    it('should return 400 when answers field is missing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      return request(app.getHttpServer())
        .post('/api/v1/quizzes/quiz-1/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/quizzes/:id/questions', () => {
    it('should return questions for an authenticated user', async () => {
      const mockQuestions = [
        { id: 'q-1', question: 'What is 2+2?', options: ['3', '4', '5'], order: 1 },
      ];

      mockQuizzesService.getQuizQuestions.mockResolvedValue(mockQuestions);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .get('/api/v1/quizzes/quiz-1/questions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });
  });
});
