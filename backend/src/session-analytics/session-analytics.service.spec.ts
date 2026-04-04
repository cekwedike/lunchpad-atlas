import { Test, TestingModule } from '@nestjs/testing';
import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionAnalyticsService } from './session-analytics.service';
import { PrismaService } from '../prisma.service';

// Mock the Google Generative AI module
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
      startChat: jest.fn(),
    }),
  })),
}));

describe('SessionAnalyticsService', () => {
  let service: SessionAnalyticsService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    cohortFacilitator: {
      findFirst: jest.fn(),
    },
    guestSession: {
      findFirst: jest.fn(),
    },
    sessionAnalytics: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    attendance: {
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string, defaultVal?: any) => {
      const map: Record<string, string> = {
        GEMINI_API_KEY: 'test-api-key',
        GEMINI_MODEL: 'gemini-1.5-flash',
      };
      return map[key] ?? defaultVal ?? null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SessionAnalyticsService>(SessionAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeSessionWithAI', () => {
    it('should throw error when model is not initialized', async () => {
      // Create service without API key
      mockConfigService.get.mockReturnValue(null);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SessionAnalyticsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const svc = module.get<SessionAnalyticsService>(SessionAnalyticsService);

      await expect(svc.analyzeSessionWithAI('session-1', 'transcript')).rejects.toThrow(
        'Gemini API key not configured',
      );
    });

    it('should throw BadGatewayException when Gemini API fails', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockRejectedValue(new Error('API error')),
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel),
      }));

      // Re-create service
      mockConfigService.get.mockImplementation((key: string, defaultVal?: any) => {
        const map: Record<string, string> = {
          GEMINI_API_KEY: 'test-api-key',
          GEMINI_MODEL: 'gemini-1.5-flash',
        };
        return map[key] ?? defaultVal ?? null;
      });
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SessionAnalyticsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const svc = module.get<SessionAnalyticsService>(SessionAnalyticsService);

      await expect(svc.analyzeSessionWithAI('session-1', 'transcript')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('getSessionAnalytics', () => {
    it('should return analytics for a session', async () => {
      const mockAnalytics = {
        id: 'analytics-1',
        sessionId: 'session-1',
        engagementScore: 80,
        session: { id: 'session-1', title: 'Session 1', cohort: { id: 'cohort-1', name: 'Alpha' } },
      };
      mockPrismaService.session.findUnique.mockResolvedValue({ cohortId: 'cohort-1' });
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'ADMIN', cohortId: null });
      mockPrismaService.sessionAnalytics.findFirst.mockResolvedValue(mockAnalytics);

      const result = await service.getSessionAnalytics('session-1', 'admin-1');

      expect(result).toEqual(mockAnalytics);
      expect(mockPrismaService.sessionAnalytics.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sessionId: 'session-1' } }),
      );
    });

    it('should return null when no analytics found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue({ cohortId: 'cohort-1' });
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'ADMIN', cohortId: null });
      mockPrismaService.sessionAnalytics.findFirst.mockResolvedValue(null);

      const result = await service.getSessionAnalytics('session-1', 'admin-1');

      expect(result).toBeNull();
    });
  });

  describe('getCohortAnalytics', () => {
    it('should return cohort analytics with averages', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          title: 'Session 1',
          scheduledDate: new Date('2024-01-15'),
          sessionAnalytics: [
            {
              engagementScore: 80,
              participationRate: 70,
              keyTopics: ['leadership', 'teamwork'],
            },
          ],
        },
        {
          id: 'session-2',
          title: 'Session 2',
          scheduledDate: new Date('2024-01-22'),
          sessionAnalytics: [
            {
              engagementScore: 60,
              participationRate: 50,
              keyTopics: ['communication', 'teamwork'],
            },
          ],
        },
      ];
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'ADMIN', cohortId: null });
      mockPrismaService.session.findMany.mockResolvedValue(mockSessions);

      const result = await service.getCohortAnalytics('cohort-1', 'admin-1');

      expect(result.cohortId).toBe('cohort-1');
      expect(result.totalSessions).toBe(2);
      expect(result.analyzedSessions).toBe(2);
      expect(result.averageEngagement).toBe(70);
      expect(result.averageParticipation).toBe(60);
      expect(result.topicFrequency).toEqual(
        expect.objectContaining({ teamwork: 2, leadership: 1, communication: 1 }),
      );
    });

    it('should return zeroed averages when no sessions have analytics', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'ADMIN', cohortId: null });
      mockPrismaService.session.findMany.mockResolvedValue([
        { id: 'session-1', title: 'Session 1', scheduledDate: new Date(), sessionAnalytics: [] },
      ]);

      const result = await service.getCohortAnalytics('cohort-1', 'admin-1');

      expect(result.averageEngagement).toBe(0);
      expect(result.averageParticipation).toBe(0);
      expect(result.analyzedSessions).toBe(0);
    });
  });

  describe('deleteSessionAnalytics', () => {
    it('should throw NotFoundException when no analytics exist for session', async () => {
      mockPrismaService.sessionAnalytics.findFirst.mockResolvedValue(null);

      await expect(service.deleteSessionAnalytics('session-1')).rejects.toThrow(NotFoundException);
    });

    it('should delete analytics when found', async () => {
      const mockAnalytics = { id: 'analytics-1', sessionId: 'session-1' };
      mockPrismaService.sessionAnalytics.findFirst.mockResolvedValue(mockAnalytics);
      mockPrismaService.sessionAnalytics.delete.mockResolvedValue(mockAnalytics);

      const result = await service.deleteSessionAnalytics('session-1');

      expect(mockPrismaService.sessionAnalytics.delete).toHaveBeenCalledWith({
        where: { id: 'analytics-1' },
      });
      expect(result).toEqual(mockAnalytics);
    });
  });
});
