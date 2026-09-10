import { Injectable } from "@nestjs/common";

/**
 * Root service providing basic application health confirmation.
 */
@Injectable()
export class AppService {
  /**
   * Returns a standard greeting message.
   *
   * @returns Greeting string.
   */
  getHello(): string {
    return "Hello World!";
  }
}

