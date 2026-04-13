import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { FeedbackController } from '../src/feedback/feedback.controller';
import { FeedbackService } from '../src/feedback/feedback.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { PrismaService } from '../src/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { EmailService } from '../src/email/email.service';

/**
 * E2E tests for the Feedback endpoints.
 * PrismaService and FeedbackService are mocked.
 */
describe('Feedback (e2e)', () => {
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

  const mockFeedbackService = {
    create: jest.fn(),
    getMyFeedback: jest.fn(),
    getAllFeedback: jest.fn(),
    respond: jest.fn(),
    delete: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(undefined),
    notifyAdminsUserRegistered: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(undefined),
  };

  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
    sendAccountCreatedEmail: jest.fn().mockResolvedValue(undefined),
  };

  const TEST_JWT_SECRET = 'test-feedback-e2e-secret';

  const mockUser = {
    id: 'user-test-1',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'FELLOW',
    isSuspended: false,
  };

  const mockAdminUser = {
    id: 'admin-test-1',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
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
      controllers: [FeedbackController],
      providers: [
        { provide: FeedbackService, useValue: mockFeedbackService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
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
    await app?.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const getAuthToken = (user = mockUser) => {
    return jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  };

  describe('POST /api/v1/feedback', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/feedback')
        .send({ type: 'SUGGESTION', subject: 'Test', message: 'Hello' })
        .expect(401);
    });

    it('should create feedback when authenticated', async () => {
      const mockFeedback = {
        id: 'feedback-1',
        userId: mockUser.id,
        type: 'SUGGESTION',
        subject: 'Feature Request',
        message: 'Please add dark mode',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      mockFeedbackService.create.mockResolvedValue(mockFeedback);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'SUGGESTION',
          subject: 'Feature Request',
          message: 'Please add dark mode',
        })
        .expect(201);

      expect(response.body.id).toBe('feedback-1');
      expect(mockFeedbackService.create).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ type: 'SUGGESTION', subject: 'Feature Request' }),
      );
    });

    it('should return 400 when required fields are missing', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      return request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'SUGGESTION' }) // missing subject and message
        .expect(400);
    });
  });

  describe('GET /api/v1/feedback/my', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/feedback/my')
        .expect(401);
    });

    it('should return user feedback when authenticated', async () => {
      const mockFeedback = [
        {
          id: 'feedback-1',
          userId: mockUser.id,
          type: 'SUGGESTION',
          subject: 'Feature Request',
          message: 'Please add dark mode',
          status: 'PENDING',
        },
        {
          id: 'feedback-2',
          userId: mockUser.id,
          type: 'BUG_REPORT',
          subject: 'Bug Found',
          message: 'Login button broken',
          status: 'REVIEWED',
        },
      ];

      mockFeedbackService.getMyFeedback.mockResolvedValue(mockFeedback);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .get('/api/v1/feedback/my')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(mockFeedbackService.getMyFeedback).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('GET /api/v1/feedback/admin', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/feedback/admin')
        .expect(401);
    });

    it('should return all feedback when admin is authenticated', async () => {
      const mockAllFeedback = [
        {
          id: 'feedback-1',
          userId: 'user-other',
          type: 'SUGGESTION',
          subject: 'Test',
          status: 'PENDING',
          user: { id: 'user-other', firstName: 'Other', lastName: 'User' },
        },
      ];

      mockFeedbackService.getAllFeedback.mockResolvedValue(mockAllFeedback);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);

      const token = getAuthToken(mockAdminUser);

      const response = await request(app.getHttpServer())
        .get('/api/v1/feedback/admin')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });
  });

  describe('DELETE /api/v1/feedback/:id', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .delete('/api/v1/feedback/feedback-1')
        .expect(401);
    });

    it('should delete own feedback when authenticated', async () => {
      const mockDeletedFeedback = {
        id: 'feedback-1',
        userId: mockUser.id,
      };

      mockFeedbackService.delete.mockResolvedValue(mockDeletedFeedback);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .delete('/api/v1/feedback/feedback-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockFeedbackService.delete).toHaveBeenCalledWith(
        mockUser.id,
        'feedback-1',
        false, // not admin
      );
    });

    it('should call delete with isAdmin=true for admin users', async () => {
      const mockDeletedFeedback = { id: 'feedback-1', userId: 'another-user' };
      mockFeedbackService.delete.mockResolvedValue(mockDeletedFeedback);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);

      const token = getAuthToken(mockAdminUser);

      await request(app.getHttpServer())
        .delete('/api/v1/feedback/feedback-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockFeedbackService.delete).toHaveBeenCalledWith(
        mockAdminUser.id,
        'feedback-1',
        true, // is admin
      );
    });
  });

  describe('PATCH /api/v1/feedback/admin/:id/respond', () => {
    it('should return 403 for non-admin users', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const token = getAuthToken(mockUser);

      await request(app.getHttpServer())
        .patch('/api/v1/feedback/admin/feedback-1/respond')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'REVIEWED', adminNote: 'Checked' })
        .expect(403);
    });

    it('should allow admin users to respond', async () => {
      const updatedFeedback = {
        id: 'feedback-1',
        userId: mockUser.id,
        status: 'REVIEWED',
        adminNote: 'Checked and acknowledged',
      };
      mockFeedbackService.respond.mockResolvedValue(updatedFeedback);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);
      const token = getAuthToken(mockAdminUser);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/feedback/admin/feedback-1/respond')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'REVIEWED', adminNote: 'Checked and acknowledged' })
        .expect(200);

      expect(response.body.id).toBe('feedback-1');
      expect(mockFeedbackService.respond).toHaveBeenCalledWith(
        mockAdminUser.id,
        'feedback-1',
        expect.objectContaining({
          status: 'REVIEWED',
          adminNote: 'Checked and acknowledged',
        }),
      );
    });
  });
});
