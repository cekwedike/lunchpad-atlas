import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

function isMustChangePasswordAllowed(ctx: ExecutionContext): boolean {
  const req = ctx.switchToHttp().getRequest<{ method?: string; path?: string; url?: string }>();
  const method = (req.method ?? '').toUpperCase();
  const path = (req.path || req.url?.split('?')[0] || '').replace(/\/$/, '') || '/';
  if (method === 'GET' && (path.endsWith('/users/me') || path.endsWith('/auth/me'))) {
    return true;
  }
  if (method === 'POST' && path.endsWith('/users/me/change-password')) {
    return true;
  }
  return false;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(
    err: Error | undefined,
    user: TUser,
    info: unknown,
    context: ExecutionContext,
    status?: unknown,
  ): TUser {
    const result = super.handleRequest(err, user, info, context, status) as TUser & {
      mustChangePassword?: boolean;
    };
    if (result && typeof result === 'object' && result.mustChangePassword === true) {
      if (!isMustChangePasswordAllowed(context)) {
        throw new ForbiddenException(
          'You must change your password before using this resource',
        );
      }
    }
    return result;
  }
}
