// IMPORTANT: instrument must be imported before anything else
import './instrument';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET must be set in production');
  }

  // Security headers
  app.use(helmet());

  // Enable CORS for frontend
  const allowedOrigins = isProduction
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : Array.from(
        new Set(
          [
            process.env.FRONTEND_URL,
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
          ].filter(Boolean),
        ),
      );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix('api/v1');

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // Enable class-transformer
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerEnabled = !isProduction || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('ATLAS API')
      .setDescription(
        'Accelerating Talent for Leadership & Success - Gamified Learning Management System',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('resources', 'Learning resources endpoints')
      .addTag('discussions', 'Discussion forum endpoints')
      .addTag('quizzes', 'Quiz and assessment endpoints')
      .addTag('leaderboard', 'Leaderboard and rankings endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);

  const publicUrl = process.env.RENDER_EXTERNAL_URL || process.env.RENDER_PUBLIC_URL || null;
  if (publicUrl) {
    console.log(`🚀 Backend API running on: ${publicUrl}/api/v1`);
    if (swaggerEnabled) console.log(`📚 API Documentation: ${publicUrl}/api/docs`);
  } else {
    console.log(`🚀 Backend API running on: http://localhost:${port}/api/v1`);
    if (swaggerEnabled) {
      console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    }
  }
}
bootstrap();
