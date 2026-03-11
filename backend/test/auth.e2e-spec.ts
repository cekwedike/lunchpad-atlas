import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { EmailService } from '../src/email/email.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import * as bcrypt from 'bcrypt';

/**
 * E2E tests for the Auth endpoints (/auth/login, /auth/register).
 * PrismaService is mocked so no real DB connection is required.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    cohort: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(undefined),
    notifyAdminsUserRegistered: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
    sendAccountCreatedEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-e2e-secret-key';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-e2e-secret-key',
          signOptions: { expiresIn: '7d' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 401 when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'notfound@test.com', password: 'password123' })
        .expect(401);
    });

    it('should return 401 when password is wrong', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'FELLOW',
        isSuspended: false,
      });

      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 200 with accessToken on valid credentials', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'FELLOW',
        isSuspended: false,
      });

      mockPrismaService.user.update.mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
    });

    it('should return 400 for invalid email format', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'somepassword' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should return 401 when attempting to register without JWT token', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
        })
        .expect(401);
    });

    it('should return 201 with valid JWT admin token and valid body', async () => {
      const password = 'adminpassword';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Mock login first to get a token
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'admin-1',
        email: 'admin@test.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isSuspended: false,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password })
        .expect(201);

      const token = loginResponse.body.accessToken;

      // Mock admin token validation
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'admin-1',
        email: 'admin@test.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isSuspended: false,
      });

      // Mock user creation
      mockPrismaService.cohort.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'new-user-1',
        email: 'newuser@test.com',
        firstName: 'New',
        lastName: 'User',
        role: 'FELLOW',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'newuser@test.com',
          password: 'Password123!',
          name: 'New User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 without token', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);
    });

    it('should return current user with valid token', async () => {
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Login to get token
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@test.com',
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'FELLOW',
        isSuspended: false,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password })
        .expect(201);

      const token = loginResponse.body.accessToken;

      // Mock JWT validation lookup
      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'FELLOW',
        isSuspended: false,
      });

      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', 'test@test.com');
    });
  });
});
