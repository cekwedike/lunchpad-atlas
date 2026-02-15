import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { LoginDto, RegisterDto, SetupAdminDto, AuthResponseDto } from './dto/auth.dto';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getCohortDurationMonths,
  getMonthlyCapForDuration,
} from '../common/gamification.utils';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    try {
      const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Resolve cohort assignment
        let cohortId: string | undefined = dto.cohortId || undefined;

        if (dto.role === 'FACILITATOR' && cohortId) {
          const cohort = await this.prisma.cohort.findUnique({
            where: { id: cohortId },
          });

          if (!cohort) {
            throw new BadRequestException('Cohort not found');
          }
        }

        // For FELLOW role, auto-assign to 2026 cohort only if it already exists
        if ((!dto.role || dto.role === 'FELLOW') && !cohortId) {
          const defaultCohort = await this.prisma.cohort.findFirst({
            where: { name: '2026' },
          });

          if (defaultCohort) {
            cohortId = defaultCohort.id;
          }
        }

        // Compute the monthly points cap based on the assigned cohort's duration.
        let monthlyPointsCap: number | undefined;
        if (cohortId) {
          const cohort = await this.prisma.cohort.findUnique({
            where: { id: cohortId },
            select: { startDate: true, endDate: true },
          });
          if (cohort) {
            const months = getCohortDurationMonths(cohort.startDate, cohort.endDate);
            monthlyPointsCap = getMonthlyCapForDuration(months);
          }
        }

      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          firstName: dto.name.split(' ')[0] || dto.name,
          lastName: dto.name.split(' ').slice(1).join(' ') || '',
          passwordHash: hashedPassword,
          role: dto.role || 'FELLOW',
          cohortId,
          ...(monthlyPointsCap !== undefined ? { monthlyPointsCap } : {}),
        },
      });

      await this.notificationsService.notifyAdminsUserRegistered(user.id);

      return this.generateTokens(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002 is the error code for unique constraint violation
        if (error.code === 'P2002') {
          throw new ConflictException('A user with this email already exists');
        }
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.generateTokens(user);
  }

  async getSetupStatus(): Promise<{ needsSetup: boolean }> {
    const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    return { needsSetup: adminCount === 0 };
  }

  async setupFirstAdmin(dto: SetupAdminDto): Promise<AuthResponseDto> {
    const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount > 0) {
      throw new ForbiddenException('Setup already complete. An admin account already exists.');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        firstName: dto.name.split(' ')[0] || dto.name,
        lastName: dto.name.split(' ').slice(1).join(' ') || '',
        passwordHash: hashedPassword,
        role: 'ADMIN',
      },
    });
    return this.generateTokens(user);
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        lastLoginAt: true,
        isSuspended: true,
      },
    });

    if (!user) return null;
    if (user.isSuspended) throw new UnauthorizedException('Your account has been suspended. Contact an administrator.');

    // Touch lastLoginAt at most once per 15 minutes so "active" status stays current
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (!user.lastLoginAt || user.lastLoginAt < fifteenMinutesAgo) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date() },
      });
    }

    return {
      ...user,
      name: `${user.firstName} ${user.lastName}`.trim(),
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    let payload: any;
    try {
      const refreshSecret =
        (process.env.JWT_REFRESH_SECRET ||
          process.env.JWT_SECRET! + '_refresh');
      payload = this.jwtService.verify(token, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Verify user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const accessPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(accessPayload),
    };
  }

  private generateTokens(user: any): AuthResponseDto {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const name =
      user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();

    const refreshSecret =
      (process.env.JWT_REFRESH_SECRET ||
        process.env.JWT_SECRET! + '_refresh');

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: refreshSecret,
        expiresIn: '30d',
      }),
      user: {
        id: user.id,
        email: user.email,
        name,
        role: user.role,
      },
    };
  }
}
