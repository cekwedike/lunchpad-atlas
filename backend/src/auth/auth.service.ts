import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

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

      // For FELLOW role, find or create default 2026 cohort and assign
      let cohortId: string | undefined = undefined;
      if (!dto.role || dto.role === 'FELLOW') {
        // Find the default 2026 cohort
        let defaultCohort = await this.prisma.cohort.findFirst({
          where: {
            name: '2026',
          },
        });

        // Create it if it doesn't exist
        if (!defaultCohort) {
          const startDate = new Date('2026-01-01');
          const endDate = new Date('2026-12-31');

          defaultCohort = await this.prisma.cohort.create({
            data: {
              name: '2026',
              startDate,
              endDate,
              state: 'ACTIVE',
            },
          });
        }

        cohortId = defaultCohort.id;
      }

      const user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          firstName: dto.name.split(' ')[0] || dto.name,
          lastName: dto.name.split(' ').slice(1).join(' ') || '',
          passwordHash: hashedPassword,
          role: dto.role || 'FELLOW',
          cohortId,
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
      },
    });

    if (!user) return null;

    return {
      ...user,
      name: `${user.firstName} ${user.lastName}`.trim(),
    };
  }

  private generateTokens(user: any): AuthResponseDto {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const name =
      user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name,
        role: user.role,
      },
    };
  }
}
