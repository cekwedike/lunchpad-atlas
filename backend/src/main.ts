import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });
  
  // Set global API prefix
  app.setGlobalPrefix('api/v1');
  
  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  console.log(`🚀 Backend API running on: http://localhost:${port}/api/v1`);
}
bootstrap();
