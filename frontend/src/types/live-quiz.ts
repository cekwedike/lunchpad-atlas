export enum LiveQuizStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface QuizOption {
  text: string;
  color: 'red' | 'blue' | 'yellow' | 'green';
}

export interface LiveQuizQuestion {
  id: string;
  liveQuizId: string;
  questionText: string;
  options: QuizOption[];
  correctAnswer: number;
  orderIndex: number;
  timeLimit: number;
  pointValue: number;
  createdAt: string;
}

export interface LiveQuizParticipant {
  id: string;
  liveQuizId: string;
  userId: string;
  displayName: string;
  totalScore: number;
  correctCount: number;
  streak: number;
  rank: number | null;
  joinedAt: string;
}

export interface LiveQuiz {
  id: string;
  sessions?: Array<{ session: { id: string; title: string } }>;
  title: string;
  description?: string;
  totalQuestions: number;
  timePerQuestion: number;
  status: LiveQuizStatus;
  currentQuestion: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  questions?: LiveQuizQuestion[];
  participants?: LiveQuizParticipant[];
}

export interface CreateLiveQuizDto {
  sessionIds: string[];
  title: string;
  description?: string;
  timePerQuestion?: number;
  questions: {
    questionText: string;
    options: QuizOption[];
    correctAnswer: number;
    timeLimit?: number;
    pointValue?: number;
  }[];
}

export interface JoinLiveQuizDto {
  userId: string;
  displayName: string;
}

export interface SubmitAnswerDto {
  participantId: string;
  questionId: string;
  selectedAnswer: number;
  timeToAnswer: number;
}

// WebSocket Events
export interface ParticipantJoinedEvent {
  participant: LiveQuizParticipant;
  participantCount: number;
}

export interface QuizStartedEvent {
  quizId: string;
  currentQuestion: number;
  question: LiveQuizQuestion;
  startedAt: string;
}

export interface QuestionShownEvent {
  questionIndex: number;
  question: LiveQuizQuestion;
  timeLimit: number;
}

export interface QuizCompletedEvent {
  quizId: string;
  leaderboard: LiveQuizParticipant[];
  completedAt: string;
}

export interface LeaderboardUpdateEvent {
  leaderboard: LiveQuizParticipant[];
}

export interface AnswerResultEvent {
  isCorrect: boolean;
  pointsEarned: number;
  streakBonus: number;
  newStreak: number;
}

export interface ResultsShownEvent {
  questionId: string;
  correctAnswer: number;
  statistics: {
    option0: number;
    option1: number;
    option2: number;
    option3: number;
  };
}
