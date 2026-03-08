import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import { FeedbackType, FeedbackStatus, UserRole, NotificationType } from '@prisma/client';

export interface CreateFeedbackDto {
  type: FeedbackType;
  subject: string;
  message: string;
}

export interface RespondFeedbackDto {
  status: FeedbackStatus;
  adminNote?: string;
}

@Injectable()
export class FeedbackService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        type: dto.type,
        subject: dto.subject,
        message: dto.message,
      },
      include: { user: true },
    });

    // Notify all admins — in-app notification + email
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true, email: true, firstName: true },
    });

    const frontendUrl = this.configService.get('FRONTEND_URL');
    const typeLabel = this.formatType(dto.type);
    const submitterName = `${feedback.user.firstName} ${feedback.user.lastName}`;

    for (const admin of admins) {
      // In-app notification
      this.notificationsService
        .createNotification({
          userId: admin.id,
          type: NotificationType.FEEDBACK_SUBMITTED,
          title: `New ${typeLabel} from ${submitterName}`,
          message: `"${dto.subject}" — ${dto.message.substring(0, 120)}${dto.message.length > 120 ? '…' : ''}`,
          data: { feedbackId: feedback.id },
        })
        .catch(() => null);

      // Email
      this.emailService
        .sendNotificationEmail(admin.email, {
          firstName: admin.firstName,
          title: `New Feedback Submitted: ${typeLabel}`,
          message: `${submitterName} submitted a new ${typeLabel.toLowerCase()}: "${dto.subject}"\n\n${dto.message}`,
          actionUrl: `${frontendUrl}/dashboard/admin/feedback`,
          actionText: 'View Feedback',
        })
        .catch(() => null);
    }

    return feedback;
  }

  async getMyFeedback(userId: string) {
    return this.prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllFeedback(status?: FeedbackStatus, type?: FeedbackType) {
    return this.prisma.feedback.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respond(adminId: string, feedbackId: string, dto: RespondFeedbackDto) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id: feedbackId },
      include: { user: true },
    });

    if (!feedback) throw new NotFoundException('Feedback not found');

    const updated = await this.prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: dto.status,
        adminNote: dto.adminNote ?? feedback.adminNote,
        respondedAt: new Date(),
      },
      include: { user: true },
    });

    // Notify submitter — in-app notification + email
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const statusLabel = this.formatStatus(dto.status);
    const responseMessage = dto.adminNote
      ? `Your submission "${feedback.subject}" has been reviewed.\n\nAdmin note: ${dto.adminNote}`
      : `Your submission "${feedback.subject}" has been marked as ${statusLabel}.`;

    // In-app notification
    this.notificationsService
      .createNotification({
        userId: feedback.userId,
        type: NotificationType.FEEDBACK_RESPONDED,
        title: `Your feedback has been ${statusLabel}`,
        message: dto.adminNote
          ? `"${feedback.subject}" — Admin note: ${dto.adminNote.substring(0, 100)}${dto.adminNote.length > 100 ? '…' : ''}`
          : `"${feedback.subject}" has been marked as ${statusLabel}.`,
        data: { feedbackId: feedbackId },
      })
      .catch(() => null);

    // Email
    this.emailService
      .sendNotificationEmail(feedback.user.email, {
        firstName: feedback.user.firstName,
        title: `Your feedback has been ${statusLabel}`,
        message: responseMessage,
        actionUrl: `${frontendUrl}/dashboard/feedback`,
        actionText: 'View My Feedback',
      })
      .catch(() => null);

    return updated;
  }

  async delete(userId: string, feedbackId: string, isAdmin: boolean) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id: feedbackId },
    });

    if (!feedback) throw new NotFoundException('Feedback not found');
    if (!isAdmin && feedback.userId !== userId) {
      throw new ForbiddenException('Cannot delete another user\'s feedback');
    }

    return this.prisma.feedback.delete({ where: { id: feedbackId } });
  }

  private formatType(type: FeedbackType): string {
    const labels: Record<FeedbackType, string> = {
      SUGGESTION: 'Suggestion',
      BUG_REPORT: 'Bug Report',
      CONCERN: 'Concern',
      GENERAL: 'General Feedback',
    };
    return labels[type] ?? type;
  }

  private formatStatus(status: FeedbackStatus): string {
    const labels: Record<FeedbackStatus, string> = {
      PENDING: 'pending',
      REVIEWED: 'reviewed',
      ACCEPTED: 'accepted',
      DECLINED: 'declined',
      CLOSED: 'closed',
    };
    return labels[status] ?? status.toLowerCase();
  }
}
