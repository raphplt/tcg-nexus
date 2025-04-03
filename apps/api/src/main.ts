import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import * as express from 'express';
import * as cors from 'cors';
import { auth } from './auth/auth';

dotenv.config();

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // Configure CORS properly - remove the conflicting configurations
    app.use(
      cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true // important for cookies
      })
    );

    // Order matters - CORS middleware must be applied before route handlers
    app.use(express.json());
    app.useGlobalPipes(new ValidationPipe());
    app.use('/api/auth/sign-up', toNodeHandler(auth));
    app.use('/api/auth/sign-in', toNodeHandler(auth));
    app.use('/api/auth/sign-out', toNodeHandler(auth));

    const port = process.env.PORT ?? 3001;
    await app.listen(port).then(() => {
      console.log(`🚀 Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
}
bootstrap().catch((err) => {
  console.error(err);
});