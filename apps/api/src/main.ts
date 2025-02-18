import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(new ValidationPipe());
    app.enableCors({ origin: '*' });

    // app.use(passport.initialize());
    // app.use(passport.session());

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
