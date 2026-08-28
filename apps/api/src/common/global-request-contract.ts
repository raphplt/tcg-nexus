import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AllExceptionsFilter } from "./http-exception.filter";

/**
 * Applies the request-handling contract shared by the runtime server and the
 * end-to-end harness: payload validation and the error response envelope.
 *
 * NOTE: both entry points must go through this function. While the e2e harness
 * built its application without the validation pipe, payloads that production
 * rejects with a 400 answered 201 under test — that is how the mobile
 * tournament registration shipped broken behind a green suite.
 *
 * @param app - Application instance to configure.
 */
export function applyGlobalRequestContract(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}
