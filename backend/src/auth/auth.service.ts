import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { LoginDto, RegisterDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.name.split(' ')[0] || dto.name,
        lastName: dto.name.split(' ').slice(1).join(' ') || '',
        passwordHash: hashedPassword,
        role: 'FELLOW',
      },
    });

    return this.generateTokens(user);
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
    const name = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
    
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
