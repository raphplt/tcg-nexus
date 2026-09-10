import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User } from "../user/entities/user.entity";
import { CreateCartItemDto } from "./dto/create-cart-item.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { UserCartService } from "./user_cart.service";

/**
 * Controller exposing endpoints for managing user shopping carts and cart items.
 */
@ApiTags("user-cart")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("user-cart")
export class UserCartController {
  constructor(private readonly userCartService: UserCartService) {}

  /**
   * Retrieves the shopping cart of the currently authenticated user.
   *
   * @param user Current authenticated user.
   * @returns User cart entity.
   */
  @Get("me")
  @ApiOperation({ summary: "Get current user cart" })
  @ApiResponse({ status: 200, description: "Cart retrieved successfully" })
  getMyCart(@CurrentUser() user: User) {
    return this.userCartService.findCartByUserId(user.id);
  }

  /**
   * Retrieves a specific shopping cart by its ID with ownership validation.
   *
   * @param id Cart ID.
   * @param user Current authenticated user.
   * @returns Cart entity.
   */
  @Get(":id")
  @ApiOperation({ summary: "Get cart by ID" })
  @ApiParam({ name: "id", description: "Cart identifier" })
  @ApiResponse({ status: 200, description: "Cart retrieved successfully" })
  @ApiResponse({ status: 404, description: "Cart not found" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  findOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.userCartService.findOne(id, user.id);
  }

  /**
   * Adds an item listing to the user's active shopping cart.
   *
   * @param user Current authenticated user.
   * @param createCartItemDto Item listing and quantity payload.
   * @returns Added cart item entity.
   */
  @Post("items")
  @ApiOperation({ summary: "Add item to cart" })
  @ApiResponse({ status: 201, description: "Item added to cart successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Listing not found" })
  addItemToCart(
    @CurrentUser() user: User,
    @Body() createCartItemDto: CreateCartItemDto,
  ) {
    return this.userCartService.addItemToCart(user.id, createCartItemDto);
  }

  /**
   * Updates the quantity of a specific item in the cart.
   *
   * @param user Current authenticated user.
   * @param id Cart item ID.
   * @param updateCartItemDto Quantity update payload.
   * @returns Updated cart item entity.
   */
  @Patch("items/:id")
  @ApiOperation({ summary: "Update cart item quantity" })
  @ApiParam({ name: "id", description: "Cart item identifier" })
  @ApiResponse({ status: 200, description: "Cart item updated successfully" })
  @ApiResponse({ status: 404, description: "Cart item not found" })
  @ApiResponse({ status: 400, description: "Bad request" })
  updateCartItem(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.userCartService.updateCartItem(user.id, id, updateCartItemDto);
  }

  /**
   * Removes a specific item from the cart.
   *
   * @param user Current authenticated user.
   * @param id Cart item ID.
   */
  @Delete("items/:id")
  @ApiOperation({ summary: "Remove item from cart" })
  @ApiParam({ name: "id", description: "Cart item identifier" })
  @ApiResponse({
    status: 200,
    description: "Item removed from cart successfully",
  })
  @ApiResponse({ status: 404, description: "Cart item not found" })
  @ApiResponse({ status: 400, description: "Bad request" })
  removeItemFromCart(
    @CurrentUser() user: User,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.userCartService.removeItemFromCart(user.id, id);
  }

  /**
   * Clears all items from the current user's active shopping cart.
   *
   * @param user Current authenticated user.
   */
  @Delete("me/clear")
  @ApiOperation({ summary: "Clear current user cart" })
  @ApiResponse({ status: 200, description: "Cart cleared successfully" })
  clearCart(@CurrentUser() user: User) {
    return this.userCartService.clearCart(user.id);
  }

  /**
   * Deletes a cart by ID.
   *
   * @param id Cart ID.
   * @param user Current authenticated user.
   */
  @Delete(":id")
  @ApiOperation({ summary: "Delete cart" })
  @ApiParam({ name: "id", description: "Cart identifier" })
  @ApiResponse({ status: 200, description: "Cart deleted successfully" })
  @ApiResponse({ status: 404, description: "Cart not found" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.userCartService.remove(id, user.id);
  }
}
