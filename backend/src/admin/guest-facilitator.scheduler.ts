import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class GuestFacilitatorScheduler {
  private readonly logger = new Logger(GuestFacilitatorScheduler.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Runs daily at 9:00 AM.
   * Sends an expiry reminder to any guest facilitator whose access
   * expires within the next 24 hours.
   */
  @Cron('0 9 * * *')
  async sendExpiryReminders() {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const expiringUsers = await this.prisma.user.findMany({
      where: {
        role: 'GUEST_FACILITATOR',
        guestAccessExpiresAt: {
          gte: in24h,
          lt: in48h,
        },
      },
      select: {
        email: true,
        firstName: true,
        guestAccessExpiresAt: true,
      },
    });

    this.logger.log(`Sending expiry reminders to ${expiringUsers.length} guest facilitator(s)`);

    for (const user of expiringUsers) {
      this.emailService
        .sendGuestAccessExpiryReminderEmail(user.email, {
          firstName: user.firstName,
          guestAccessExpiresAt: user.guestAccessExpiresAt!,
        })
        .catch((err) =>
          this.logger.error(`Failed to send expiry reminder to ${user.email}`, err),
        );
    }
  }
}
