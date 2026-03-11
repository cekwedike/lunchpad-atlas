import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  const mockPrismaService = {
    feedback: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockNotificationsService = {
    createNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create feedback and notify admins', async () => {
      const userId = 'user-1';
      const dto = {
        type: 'SUGGESTION' as any,
        subject: 'Test Suggestion',
        message: 'This is a test suggestion message',
      };

      const mockFeedback = {
        id: 'feedback-1',
        userId,
        ...dto,
        status: 'PENDING',
        createdAt: new Date(),
        user: {
          id: userId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
        },
      };

      const mockAdmins = [
        { id: 'admin-1', email: 'admin@test.com', firstName: 'Admin' },
      ];

      mockPrismaService.feedback.create.mockResolvedValue(mockFeedback);
      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);

      const result = await service.create(userId, dto);

      expect(result).toEqual(mockFeedback);
      expect(mockPrismaService.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          type: dto.type,
          subject: dto.subject,
          message: dto.message,
        }),
        include: { user: true },
      });
    });

    it('should send notifications to all admins', async () => {
      const userId = 'user-1';
      const dto = {
        type: 'BUG_REPORT' as any,
        subject: 'Bug found',
        message: 'Found a bug in the system',
      };

      const mockFeedback = {
        id: 'feedback-1',
        userId,
        ...dto,
        user: { id: userId, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      };

      const mockAdmins = [
        { id: 'admin-1', email: 'admin1@test.com', firstName: 'Admin1' },
        { id: 'admin-2', email: 'admin2@test.com', firstName: 'Admin2' },
      ];

      mockPrismaService.feedback.create.mockResolvedValue(mockFeedback);
      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);

      await service.create(userId, dto);

      // Give async fire-and-forget notifications time to start
      await new Promise((resolve) => setImmediate(resolve));

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { role: 'ADMIN' },
        select: { id: true, email: true, firstName: true },
      });
    });
  });

  describe('getMyFeedback', () => {
    it('should return feedback for a specific user', async () => {
      const userId = 'user-1';
      const mockFeedback = [
        {
          id: 'feedback-1',
          userId,
          type: 'SUGGESTION',
          subject: 'Test',
          message: 'Test message',
          status: 'PENDING',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.feedback.findMany.mockResolvedValue(mockFeedback);

      const result = await service.getMyFeedback(userId);

      expect(result).toEqual(mockFeedback);
      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getAllFeedback', () => {
    it('should return all feedback without filters', async () => {
      const mockFeedback = [
        {
          id: 'feedback-1',
          userId: 'user-1',
          type: 'SUGGESTION',
          status: 'PENDING',
          user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'FELLOW' },
        },
      ];

      mockPrismaService.feedback.findMany.mockResolvedValue(mockFeedback);

      const result = await service.getAllFeedback();

      expect(result).toEqual(mockFeedback);
      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          include: expect.objectContaining({ user: expect.any(Object) }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([]);

      await service.getAllFeedback('REVIEWED' as any);

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'REVIEWED' },
        }),
      );
    });

    it('should filter by type when provided', async () => {
      mockPrismaService.feedback.findMany.mockResolvedValue([]);

      await service.getAllFeedback(undefined, 'BUG_REPORT' as any);

      expect(mockPrismaService.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'BUG_REPORT' },
        }),
      );
    });
  });

  describe('respond', () => {
    it('should update feedback status and notify submitter', async () => {
      const adminId = 'admin-1';
      const feedbackId = 'feedback-1';
      const dto = { status: 'REVIEWED' as any, adminNote: 'Thanks for the feedback' };

      const mockFeedback = {
        id: feedbackId,
        userId: 'user-1',
        subject: 'Test Suggestion',
        adminNote: null,
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      };

      const mockUpdatedFeedback = {
        ...mockFeedback,
        status: 'REVIEWED',
        adminNote: dto.adminNote,
        respondedAt: new Date(),
      };

      mockPrismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      mockPrismaService.feedback.update.mockResolvedValue(mockUpdatedFeedback);

      const result = await service.respond(adminId, feedbackId, dto);

      expect(result).toEqual(mockUpdatedFeedback);
      expect(mockPrismaService.feedback.update).toHaveBeenCalledWith({
        where: { id: feedbackId },
        data: expect.objectContaining({
          status: dto.status,
          adminNote: dto.adminNote,
        }),
        include: { user: true },
      });
    });

    it('should throw NotFoundException when feedback does not exist', async () => {
      mockPrismaService.feedback.findUnique.mockResolvedValue(null);

      await expect(
        service.respond('admin-1', 'nonexistent', { status: 'REVIEWED' as any }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should allow owner to delete their own feedback', async () => {
      const userId = 'user-1';
      const feedbackId = 'feedback-1';

      const mockFeedback = { id: feedbackId, userId };
      mockPrismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      mockPrismaService.feedback.delete.mockResolvedValue(mockFeedback);

      const result = await service.delete(userId, feedbackId, false);

      expect(result).toEqual(mockFeedback);
      expect(mockPrismaService.feedback.delete).toHaveBeenCalledWith({
        where: { id: feedbackId },
      });
    });

    it('should allow admin to delete any feedback', async () => {
      const feedbackId = 'feedback-1';
      const mockFeedback = { id: feedbackId, userId: 'another-user' };

      mockPrismaService.feedback.findUnique.mockResolvedValue(mockFeedback);
      mockPrismaService.feedback.delete.mockResolvedValue(mockFeedback);

      const result = await service.delete('admin-1', feedbackId, true);

      expect(result).toEqual(mockFeedback);
    });

    it('should throw ForbiddenException when non-admin tries to delete others feedback', async () => {
      const feedbackId = 'feedback-1';
      const mockFeedback = { id: feedbackId, userId: 'other-user' };

      mockPrismaService.feedback.findUnique.mockResolvedValue(mockFeedback);

      await expect(service.delete('user-1', feedbackId, false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when feedback does not exist', async () => {
      mockPrismaService.feedback.findUnique.mockResolvedValue(null);

      await expect(service.delete('user-1', 'nonexistent', false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
