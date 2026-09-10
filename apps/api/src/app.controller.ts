import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { Public } from "./auth/decorators/public.decorator";

/**
 * Root application controller providing base connectivity confirmation.
 */
@ApiTags("app")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Root ping endpoint returning standard service greeting.
   *
   * @returns Greeting message.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Application root health ping" })
  @ApiResponse({ status: 200, description: "Greeting string." })
  getHello(): string {
    return this.appService.getHello();
  }
}

