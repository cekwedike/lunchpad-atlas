import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma.service';
import { SaveSubscriptionDto } from './dto/save-subscription.dto';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.config.get<string>('VAPID_SUBJECT', 'mailto:admin@atlas.com');

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
      this.logger.log('Web Push initialized with VAPID keys');
    } else {
      this.logger.warn('VAPID keys not configured — push notifications disabled');
    }
  }

  async saveSubscription(userId: string, dto: SaveSubscriptionDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    });
  }

  async deleteSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
  }

  async sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!this.enabled) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
    });

    const stale: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            pushPayload,
          );
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or unregistered — clean it up
            stale.push(sub.endpoint);
          } else {
            this.logger.warn(`Push failed for user ${userId}: ${err.message}`);
          }
        }
      }),
    );

    if (stale.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { endpoint: { in: stale } },
      });
    }
  }

  getVapidPublicKey(): string {
    return this.config.get<string>('VAPID_PUBLIC_KEY', '');
  }
}
