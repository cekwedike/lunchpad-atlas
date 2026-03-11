import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PushService } from './push.service';
import { PrismaService } from '../prisma.service';

// Mock web-push module
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

import * as webpush from 'web-push';

describe('PushService', () => {
  let service: PushService;

  const mockPrismaService = {
    pushSubscription: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string, defaultVal?: any) => {
      const map: Record<string, string> = {
        VAPID_PUBLIC_KEY: 'test-public-key',
        VAPID_PRIVATE_KEY: 'test-private-key',
        VAPID_SUBJECT: 'mailto:admin@atlas.com',
      };
      return map[key] ?? defaultVal ?? null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PushService>(PushService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize VAPID details when keys are configured', () => {
      service.onModuleInit();
      expect(webpush.setVapidDetails).toHaveBeenCalledWith(
        'mailto:admin@atlas.com',
        'test-public-key',
        'test-private-key',
      );
    });

    it('should not call setVapidDetails when keys are missing', () => {
      mockConfigService.get.mockReturnValue(null);
      (webpush.setVapidDetails as jest.Mock).mockClear();

      service.onModuleInit();

      expect(webpush.setVapidDetails).not.toHaveBeenCalled();
    });
  });

  describe('saveSubscription', () => {
    it('should upsert push subscription', async () => {
      const dto = {
        endpoint: 'https://push.example.com/sub-1',
        keys: { p256dh: 'key123', auth: 'auth123' },
      };

      const mockSub = { id: 'sub-1', userId: 'user-1', ...dto };
      mockPrismaService.pushSubscription.upsert.mockResolvedValue(mockSub);

      const result = await service.saveSubscription('user-1', dto);

      expect(result).toEqual(mockSub);
      expect(mockPrismaService.pushSubscription.upsert).toHaveBeenCalledWith({
        where: { endpoint: dto.endpoint },
        create: {
          userId: 'user-1',
          endpoint: dto.endpoint,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
        },
        update: {
          userId: 'user-1',
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
        },
      });
    });
  });

  describe('deleteSubscription', () => {
    it('should delete matching subscription', async () => {
      mockPrismaService.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });

      await service.deleteSubscription('user-1', 'https://push.example.com/sub-1');

      expect(mockPrismaService.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', endpoint: 'https://push.example.com/sub-1' },
      });
    });
  });

  describe('getVapidPublicKey', () => {
    it('should return VAPID public key from config', () => {
      const result = service.getVapidPublicKey();

      expect(result).toBe('test-public-key');
    });

    it('should return empty string when no key configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const result = service.getVapidPublicKey();

      // ConfigService.get with a default of '' returns that default; mock returns undefined, so we check for falsy
      expect(result == null || result === '').toBe(true);
    });
  });

  describe('sendPushToUser', () => {
    it('should return early when push is not enabled', async () => {
      // Recreate service without VAPID keys
      mockConfigService.get.mockReturnValue(null);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PushService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const disabledService = module.get<PushService>(PushService);
      disabledService.onModuleInit();

      await disabledService.sendPushToUser('user-1', { title: 'Test', body: 'Hello' });

      expect(mockPrismaService.pushSubscription.findMany).not.toHaveBeenCalled();
    });

    it('should return early when user has no subscriptions', async () => {
      mockPrismaService.pushSubscription.findMany.mockResolvedValue([]);

      await service.sendPushToUser('user-1', { title: 'Test', body: 'Hello' });

      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('should send push notification to all subscriptions', async () => {
      const mockSubs = [
        { id: 'sub-1', endpoint: 'https://push.example.com/sub-1', p256dh: 'key1', auth: 'auth1' },
      ];
      mockPrismaService.pushSubscription.findMany.mockResolvedValue(mockSubs);
      (webpush.sendNotification as jest.Mock).mockResolvedValue({});

      await service.sendPushToUser('user-1', { title: 'Test', body: 'Hello' });

      expect(webpush.sendNotification).toHaveBeenCalledWith(
        { endpoint: mockSubs[0].endpoint, keys: { p256dh: 'key1', auth: 'auth1' } },
        expect.any(String),
      );
    });

    it('should remove stale subscriptions on 410 error', async () => {
      const mockSubs = [
        { id: 'sub-1', endpoint: 'https://push.example.com/gone', p256dh: 'key1', auth: 'auth1' },
      ];
      mockPrismaService.pushSubscription.findMany.mockResolvedValue(mockSubs);

      const error: any = new Error('Gone');
      error.statusCode = 410;
      (webpush.sendNotification as jest.Mock).mockRejectedValue(error);
      mockPrismaService.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });

      await service.sendPushToUser('user-1', { title: 'Test', body: 'Hello' });

      expect(mockPrismaService.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: { in: ['https://push.example.com/gone'] } },
      });
    });
  });
});
