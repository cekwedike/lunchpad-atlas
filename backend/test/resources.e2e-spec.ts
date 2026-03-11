import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { ResourcesController } from '../src/resources/resources.controller';
import { ResourcesService } from '../src/resources/resources.service';
import { EnhancedEngagementService } from '../src/resources/enhanced-engagement.service';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { PrismaService } from '../src/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AchievementsService } from '../src/achievements/achievements.service';
import { EmailService } from '../src/email/email.service';

/**
 * E2E tests for the Resources endpoint (GET /api/v1/resources).
 * Uses mocked services to avoid a real DB or external dependencies.
 */
describe('Resources (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    resource: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    resourceProgress: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    pointsLog: {
      create: jest.fn(),
    },
    cohort: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  const mockResourcesService = {
    getResources: jest.fn(),
    markComplete: jest.fn(),
    trackEngagement: jest.fn(),
  };

  const mockEnhancedEngagementService = {
    generateEngagementReport: jest.fn(),
    getSkimmingAlerts: jest.fn(),
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
  };

  const TEST_JWT_SECRET = 'test-resources-e2e-secret';
  const mockUser = {
    id: 'user-test-1',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'FELLOW',
    name: 'Test User',
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
      controllers: [ResourcesController],
      providers: [
        { provide: ResourcesService, useValue: mockResourcesService },
        { provide: EnhancedEngagementService, useValue: mockEnhancedEngagementService },
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

  const getAuthToken = () => {
    return jwtService.sign({ sub: mockUser.id, email: mockUser.email, role: mockUser.role });
  };

  describe('GET /api/v1/resources', () => {
    it('should return 401 when not authenticated', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/resources')
        .expect(401);
    });

    it('should return 200 with resource list when authenticated', async () => {
      const mockResponse = {
        data: [
          {
            id: 'res-1',
            title: 'Intro to JavaScript',
            type: 'VIDEO',
            duration: 30,
            pointValue: 100,
            state: 'LOCKED',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockResourcesService.getResources.mockResolvedValue(mockResponse);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      const response = await request(app.getHttpServer())
        .get('/api/v1/resources')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        total: 1,
        page: 1,
      });
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Intro to JavaScript');
    });

    it('should pass query parameters to resources service', async () => {
      mockResourcesService.getResources.mockResolvedValue({
        data: [],
        total: 0,
        page: 2,
        limit: 5,
        totalPages: 0,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const token = getAuthToken();

      await request(app.getHttpServer())
        .get('/api/v1/resources?page=2&limit=5')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockResourcesService.getResources).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ page: 2, limit: 5 }),
      );
    });

    it('should return 401 with expired/invalid token', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/resources')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);
    });
  });
});
