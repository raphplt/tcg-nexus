import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { CreateSupportMessageDto } from "./dto/create-support-message.dto";
import { CreateSupportTicketDto } from "./dto/create-support-ticket.dto";
import { SupportTicketService } from "./support-ticket.service";

/**
 * Controller exposing endpoints for creating, managing, and replying to user support tickets.
 */
@ApiTags("support-tickets")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("support/tickets")
export class SupportTicketController {
  constructor(private readonly supportTicketService: SupportTicketService) {}

  /**
   * Creates a new support ticket.
   *
   * @param user Current authenticated user.
   * @param createSupportTicketDto Ticket subject and initial message payload.
   * @returns Newly created support ticket entity.
   */
  @Post()
  @ApiOperation({ summary: "Create a new support ticket" })
  create(
    @CurrentUser() user: User,
    @Body() createSupportTicketDto: CreateSupportTicketDto,
  ) {
    return this.supportTicketService.create(user, createSupportTicketDto);
  }

  /**
   * Appends a reply message to an existing support ticket thread.
   *
   * @param ticketId Support ticket ID.
   * @param user Current authenticated user.
   * @param dto Message payload.
   * @returns Newly appended support message entity.
   */
  @Post(":id/messages")
  @ApiOperation({ summary: "Add a message to a support ticket" })
  @ApiParam({ name: "id", description: "Support ticket identifier" })
  async addMessage(
    @Param("id", ParseIntPipe) ticketId: number,
    @CurrentUser() user: User,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.supportTicketService.addMessage(ticketId, user, dto);
  }

  /**
   * Retrieves all support tickets accessible to the user (or all tickets for staff).
   *
   * @param user Current authenticated user.
   * @param page Page index (1-based).
   * @param limit Maximum tickets per page.
   * @returns Paginated list of support tickets.
   */
  @Get()
  @ApiOperation({ summary: "List user support tickets" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  findAll(
    @CurrentUser() user: User,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.supportTicketService.findAll(user, Number(page), Number(limit));
  }

  /**
   * Retrieves a single support ticket by ID with its latest messages.
   *
   * @param id Support ticket ID.
   * @param user Current authenticated user.
   * @param messagesLimit Number of recent messages to embed.
   * @returns Support ticket entity with embedded messages.
   */
  @Get(":id")
  @ApiOperation({ summary: "Retrieve a support ticket by ID" })
  @ApiParam({ name: "id", description: "Support ticket identifier" })
  @ApiQuery({
    name: "messagesLimit",
    required: false,
    type: Number,
    example: 20,
  })
  findOne(
    @Param("id", ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Query("messagesLimit") messagesLimit = 20,
  ) {
    return this.supportTicketService.findOneWithMessages(
      id,
      user,
      Number(messagesLimit),
    );
  }

  /**
   * Retrieves paginated messages for a specific support ticket.
   *
   * @param ticketId Support ticket ID.
   * @param user Current authenticated user.
   * @param page Page index (1-based).
   * @param limit Maximum messages per page.
   * @returns Paginated list of support messages.
   */
  @Get(":id/messages")
  @ApiOperation({ summary: "Retrieve messages for a support ticket" })
  @ApiParam({ name: "id", description: "Support ticket identifier" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  async getMessages(
    @Param("id", ParseIntPipe) ticketId: number,
    @CurrentUser() user: User,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.supportTicketService.getMessages(
      ticketId,
      user,
      Number(page),
      Number(limit),
    );
  }

  /**
   * Closes an active support ticket.
   *
   * @param id Support ticket ID.
   * @param user Current authenticated user.
   * @returns Closed support ticket entity.
   */
  @Patch(":id/close")
  @ApiOperation({ summary: "Close a support ticket" })
  @ApiParam({ name: "id", description: "Support ticket identifier" })
  closeTicket(@Param("id") id: string, @CurrentUser() user: User) {
    return this.supportTicketService.closeTicket(+id, user);
  }
}
