import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

// Mock nodemailer and resend before imports
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'resend-id' }, error: null }),
    },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Default: notifications disabled
    mockConfigService.get.mockImplementation((key: string, defaultVal?: any) => {
      const map: Record<string, string> = {
        EMAIL_NOTIFICATIONS_ENABLED: 'false',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return map[key] ?? defaultVal ?? null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should return false when EMAIL_NOTIFICATIONS_ENABLED is not "true"', async () => {
      const result = await service.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result).toBe(false);
    });

    it('should return false and log warning when no email provider configured', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultVal?: any) => {
        const map: Record<string, string> = {
          EMAIL_NOTIFICATIONS_ENABLED: 'true',
          FRONTEND_URL: 'http://localhost:3000',
        };
        return map[key] ?? defaultVal ?? null;
      });

      // Re-create service with enabled notifications but no provider
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const svc = module.get<EmailService>(EmailService);

      const result = await svc.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result).toBe(false);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should call sendEmail with correct subject', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const data = {
        firstName: 'John',
        lastName: 'Doe',
        cohortName: 'Cohort Alpha',
        startDate: new Date('2024-01-15'),
      };

      await service.sendWelcomeEmail('john@example.com', data);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: expect.stringContaining('Cohort Alpha'),
        }),
      );
    });
  });

  describe('sendAccountCreatedEmail', () => {
    it('should call sendEmail with Fellow in subject for FELLOW role', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const data = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        role: 'FELLOW',
        password: 'TempPass_2026!',
      };

      await service.sendAccountCreatedEmail('jane@example.com', data);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Fellow'),
        }),
      );
    });

    it('should call sendEmail with Facilitator in subject for FACILITATOR role', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const data = {
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@example.com',
        role: 'FACILITATOR',
        password: 'TempPass_2026!',
      };

      await service.sendAccountCreatedEmail('bob@example.com', data);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Facilitator'),
        }),
      );
    });
  });

  describe('sendNotificationEmail', () => {
    it('should call sendEmail with notification title as subject', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const data = {
        firstName: 'Alice',
        title: 'Achievement Unlocked!',
        message: 'You earned a new badge.',
      };

      await service.sendNotificationEmail('alice@example.com', data);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'alice@example.com',
          subject: 'Achievement Unlocked!',
        }),
      );
    });
  });

  describe('sendWeeklySummaryEmail', () => {
    it('should call sendEmail with week number in subject', async () => {
      const sendEmailSpy = jest.spyOn(service, 'sendEmail').mockResolvedValue(true);

      const data = {
        firstName: 'Alice',
        weekNumber: 5,
        resourcesCompleted: 3,
        pointsEarned: 250,
        rank: 4,
        totalParticipants: 20,
      };

      await service.sendWeeklySummaryEmail('alice@example.com', data);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Week 5'),
        }),
      );
    });
  });

  describe('sendResourceUnlockEmail', () => {
    it('should call sendNotificationEmail with resource info', async () => {
      const sendNotifSpy = jest.spyOn(service, 'sendNotificationEmail').mockResolvedValue(true);

      await service.sendResourceUnlockEmail(
        'user@example.com',
        'Alice',
        'Intro to JS',
        'Session 1',
      );

      expect(sendNotifSpy).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          firstName: 'Alice',
          title: 'New Resource Available',
          message: expect.stringContaining('Intro to JS'),
        }),
      );
    });
  });

  describe('sendQuizReminderEmail', () => {
    it('should call sendNotificationEmail with quiz info', async () => {
      const sendNotifSpy = jest.spyOn(service, 'sendNotificationEmail').mockResolvedValue(true);
      const dueDate = new Date('2024-06-30');

      await service.sendQuizReminderEmail('user@example.com', 'Bob', 'Week 3 Quiz', dueDate);

      expect(sendNotifSpy).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          firstName: 'Bob',
          title: 'Quiz Reminder',
          message: expect.stringContaining('Week 3 Quiz'),
        }),
      );
    });
  });

  describe('sendSessionReminderEmail', () => {
    it('should call sendNotificationEmail with session info', async () => {
      const sendNotifSpy = jest.spyOn(service, 'sendNotificationEmail').mockResolvedValue(true);
      const scheduledDate = new Date('2024-06-15T14:00:00Z');

      await service.sendSessionReminderEmail(
        'user@example.com',
        'Carol',
        'Session 4: Networking',
        scheduledDate,
      );

      expect(sendNotifSpy).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          firstName: 'Carol',
          title: 'Upcoming Session Reminder',
          message: expect.stringContaining('Session 4: Networking'),
        }),
      );
    });
  });

  describe('sendAchievementEmail', () => {
    it('should call sendNotificationEmail with achievement info', async () => {
      const sendNotifSpy = jest.spyOn(service, 'sendNotificationEmail').mockResolvedValue(true);

      await service.sendAchievementEmail(
        'user@example.com',
        'Dave',
        'Quiz Ace',
        'Pass 10 quizzes',
      );

      expect(sendNotifSpy).toHaveBeenCalledWith(
        'user@example.com',
        expect.objectContaining({
          firstName: 'Dave',
          message: expect.stringContaining('Quiz Ace'),
        }),
      );
    });
  });
});
