import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    const config = new DocumentBuilder()
      .setTitle('TCG Nexus API')
      .setDescription('API documentation for TCG Nexus')
      .setVersion('1.0')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);

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

    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector))
    );

    app.enableCors({
      origin:
        process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
      credentials: true
    });

    const port = process.env.PORT ?? 3001;

    await app.listen(port).then(() => {
      console.log(`🚀 Server is running on http://localhost:${port}`);
      console.log(`📚 API Documentation: http://localhost:${port}/api`);
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
