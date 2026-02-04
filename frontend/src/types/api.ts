// API Types matching backend Prisma schema

export enum UserRole {
  FELLOW = 'FELLOW',
  FACILITATOR = 'FACILITATOR',
  ADMIN = 'ADMIN',
}

export enum ResourceType {
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  EXERCISE = 'EXERCISE',
  QUIZ = 'QUIZ',
}

export enum ResourceState {
  LOCKED = 'LOCKED',
  UNLOCKED = 'UNLOCKED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum CohortState {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum EventType {
  RESOURCE_VIEWED = 'RESOURCE_VIEWED',
  RESOURCE_COMPLETED = 'RESOURCE_COMPLETED',
  DISCUSSION_POSTED = 'DISCUSSION_POSTED',
  DISCUSSION_LIKED = 'DISCUSSION_LIKED',
  QUIZ_STARTED = 'QUIZ_STARTED',
  QUIZ_COMPLETED = 'QUIZ_COMPLETED',
  SESSION_ATTENDED = 'SESSION_ATTENDED',
}

export enum AchievementType {
  MILESTONE = 'MILESTONE',
  STREAK = 'STREAK',
  SOCIAL = 'SOCIAL',
  LEADERBOARD = 'LEADERBOARD',
}

// Core Models
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  cohortId: string | null;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  resourcesCompleted: number;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Cohort {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  state: CohortState;
  facilitatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  sessionNumber: number;
  title: string;
  description: string | null;
  date: Date;
  unlockDate: Date;
  cohortId: string;
  createdAt: Date;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  url: string;
  pointsValue: number;
  estimatedDuration: number;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceProgress {
  id: string;
  userId: string;
  resourceId: string;
  state: ResourceState;
  startedAt: Date | null;
  completedAt: Date | null;
  pointsEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Discussion {
  id: string;
  title: string;
  content: string;
  authorId: string;
  cohortId: string;
  resourceId: string | null;
  isPinned: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
  author?: User;
}

export interface DiscussionComment {
  id: string;
  content: string;
  discussionId: string;
  authorId: string;
  parentId: string | null;
  likeCount: number;
  createdAt: Date;
  updatedAt: Date;
  author?: User;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  resourceId: string;
  timeLimit: number | null;
  passingScore: number;
  maxAttempts: number;
  createdAt: Date;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: string;
  points: number;
  order: number;
}

export interface QuizResponse {
  id: string;
  userId: string;
  quizId: string;
  attemptNumber: number;
  answers: Record<string, string>;
  score: number;
  passed: boolean;
  pointsEarned: number;
  startedAt: Date;
  completedAt: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: AchievementType;
  pointsValue: number;
  criteria: Record<string, any>;
  iconUrl: string | null;
  createdAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
  achievement?: Achievement;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  leaderboardId: string;
  rank: number;
  points: number;
  resourcesCompleted: number;
  streak: number;
  user?: User;
}

export interface MonthlyLeaderboard {
  id: string;
  cohortId: string;
  month: Date;
  createdAt: Date;
  entries?: LeaderboardEntry[];
}

// API Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateDiscussionRequest {
  title: string;
  content: string;
  resourceId?: string;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface SubmitQuizRequest {
  answers: Record<string, string>;
}

export interface MarkResourceCompleteRequest {
  timeSpent?: number;
}
