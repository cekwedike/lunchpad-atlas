import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
      };

      mockPrismaService.user.create.mockResolvedValue({
        id: '123',
        email: registerDto.email,
        firstName: 'John',
        lastName: 'Doe',
        role: 'FELLOW',
      });
      mockJwtService.sign.mockReturnValue('test-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: registerDto.email,
          firstName: 'John',
          lastName: 'Doe',
        }),
      });
    });

    it('should throw error if database operation fails', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Jane Doe',
      };

      mockPrismaService.user.create.mockRejectedValue(
        new Error('Unique constraint failed')
      );

      await expect(service.register(registerDto)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const mockUser = {
        id: '123',
        email: loginDto.email,
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'FELLOW',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('test-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result.accessToken).toBe('test-token');
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user data when valid', async () => {
      const userId = '123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'FELLOW',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(userId);

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        name: 'John Doe',
        role: mockUser.role,
      });
    });
  });
});
