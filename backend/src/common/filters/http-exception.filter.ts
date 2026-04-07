import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import { Prisma } from '@prisma/client';

function isPrismaEngineError(exception: unknown): exception is Error {
  if (!(exception instanceof Error)) return false;
  const n = exception.constructor.name;
  return (
    n === 'PrismaClientInitializationError' ||
    n === 'PrismaClientRustPanicError' ||
    n === 'PrismaClientUnknownRequestError'
  );
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();
      if (typeof res === 'object') {
        message = res.message || exception.message;
        errors = res.errors || res['error'] || undefined;
      } else {
        message = res || exception.message;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Most chat/API 500s in production are DB connectivity or schema drift.
      status = HttpStatus.SERVICE_UNAVAILABLE;
      if (exception.code === 'P1001') {
        message =
          'Database unreachable. On Render, check DATABASE_URL (Neon) and that the database allows connections.';
      } else if (exception.code === 'P2021' || exception.code === 'P2022') {
        message =
          `Database schema is out of date (${exception.code}). Run prisma migrate deploy on the backend.`;
      } else {
        message = `Database error (${exception.code}). ${exception.message}`;
      }
      Sentry.captureException(exception);
    } else if (isPrismaEngineError(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message =
        'Cannot connect to the database. Verify DATABASE_URL on the backend and redeploy.';
      Sentry.captureException(exception);
    } else {
      Sentry.captureException(exception);
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
