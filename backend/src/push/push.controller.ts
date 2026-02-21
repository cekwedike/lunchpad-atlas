import {
  Controller,
  Post,
  Delete,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PushService } from './push.service';
import { SaveSubscriptionDto } from './dto/save-subscription.dto';

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  /** Returns the VAPID public key so the browser can subscribe */
  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.pushService.getVapidPublicKey() };
  }

  /** Save (upsert) a push subscription for the authenticated user */
  @Post('subscribe')
  subscribe(@Request() req: any, @Body() dto: SaveSubscriptionDto) {
    return this.pushService.saveSubscription(req.user.sub, dto);
  }

  /** Remove a push subscription */
  @Delete('unsubscribe')
  unsubscribe(@Request() req: any, @Query('endpoint') endpoint: string) {
    return this.pushService.deleteSubscription(req.user.sub, endpoint);
  }
}
