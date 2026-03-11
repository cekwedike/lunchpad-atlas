import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { NotificationsController } from '../src/notifications/notifications.controller';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { PrismaService } from '../src/prisma.service';
import { EmailService } from '../src/email/email.service';

/**
 * E2E tests for the Notifications endpoints.
 * PrismaService and NotificationsService are mocked.
 */
describe('Notifications (e2e)', () => {
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

  const mockNotificationsService = {
    getUserNotifications: jest.fn(),
    getAllNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    getAllUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAsReadAdmin: jest.fn(),
    markAllAsRead: jest.fn(),
    markAllAsReadAdmin: jest.fn(),
    deleteNotification: jest.fn(),
    deleteNotificationAdmin: jest.fn(),
    deleteAll: jest.fn(),
    deleteAllAdmin: jest.fn(),
    deleteAllRead: jest.fn(),
    deleteAllReadAdmin: jest.fn(),
    createNotification: jest.fn().mockResolvedValue(undefined),
    notifyAdminsUserRegistered: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
    sendAccountCreatedEmail: jest.fn().mockResolvedValue(undefined),
  };

  const TEST_JWT_SECRET = 'test-notifications-e2e-secret';
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
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PrismaService, useValue: mockPrismaService },
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

  describe('GET /api/v1/notifications', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);
    });

    it('should return 200 with notifications list when authenticated', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          userId: mockUser.id,
          type: 'SYSTEM_ALERT',
          title: 'Test Notification',
          message: 'This is a test',
          isRead: false,
          createdAt: new Date().toISOString(),
        },
      ];

      mockNotificationsService.getUserNotifications.mockResolvedValue(mockNotifications);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Test Notification');
      expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith(
        mockUser.id,
        20,
        false,
      );
    });

    it('should pass unreadOnly=true query param', async () => {
      mockNotificationsService.getUserNotifications.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      await request(app.getHttpServer())
        .get('/api/v1/notifications?unreadOnly=true&limit=10')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith(
        mockUser.id,
        10,
        true,
      );
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return unread count for authenticated user', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(5);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ count: 5 });
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .patch('/api/v1/notifications/notif-1/read')
        .expect(401);
    });

    it('should mark notification as read for authenticated user', async () => {
      mockNotificationsService.markAsRead.mockResolvedValue({ count: 1 });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/notif-1/read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith('notif-1', mockUser.id);
    });

    it('should use markAsReadAdmin when admin marks notification as read', async () => {
      mockNotificationsService.markAsReadAdmin.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue(mockAdminUser);

      const token = getAuthToken(mockAdminUser);

      await request(app.getHttpServer())
        .patch('/api/v1/notifications/notif-1/read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockNotificationsService.markAsReadAdmin).toHaveBeenCalledWith('notif-1');
    });
  });

  describe('PATCH /api/v1/notifications/mark-all-read', () => {
    it('should mark all notifications as read for user', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue({ count: 3 });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .patch('/api/v1/notifications/mark-all-read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    it('should delete notification for user', async () => {
      mockNotificationsService.deleteNotification.mockResolvedValue({ count: 1 });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .delete('/api/v1/notifications/notif-1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockNotificationsService.deleteNotification).toHaveBeenCalledWith('notif-1', mockUser.id);
    });
  });
});
