import {
  Controller,
  Post,
  Delete,
  Body,
  Get,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
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
  subscribe(@Request() req: { user?: { id: string } }, @Body() dto: SaveSubscriptionDto) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.pushService.saveSubscription(userId, dto);
  }

  /** Remove a push subscription */
  @Delete('unsubscribe')
  unsubscribe(
    @Request() req: { user?: { id: string } },
    @Query('endpoint') endpoint: string,
  ) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();
    return this.pushService.deleteSubscription(userId, endpoint);
  }
}
