import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/http-exception.filter';

dotenv.config();

export async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, { rawBody: true });
    app.use(cookieParser());
    app.setGlobalPrefix('api');

    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('TCG Nexus API')
        .setDescription('API documentation for TCG Nexus')
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'Authorization',
            description: 'Entrer le token JWT',
            in: 'header'
          },
          'bearerAuth'
        )
        .build();
      const documentFactory = () => SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, documentFactory, {
        swaggerOptions: {
          docExpansion: 'none',
          defaultModelsExpandDepth: -1
        }
      });
    }

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true
        }
      })
    );

    app.useGlobalFilters(new AllExceptionsFilter());

    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector))
    );

    app.enableCors({
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL || 'https://tcg-nexus-web.vercel.app'
          : 'http://localhost:3000',
      credentials: true
    });

    const port = process.env.PORT ?? 3001;

    await app.listen(port, '0.0.0.0').then(() => {
      // console.log(`🚀 Server is running on http://localhost:${port}`);
      console.log(`🚀 Server running on http://0.0.0.0:${port}`);
      console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
  }
}

// Only auto-start when executed as an entrypoint (not when imported by tests).
if (require.main === module) {
  bootstrap().catch((err) => {
    console.error(err);
  });
}
