import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe
} from '@nestjs/common';
import { UserCartService } from './user_cart.service';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse
} from '@nestjs/swagger';

@ApiTags('user-cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-cart')
export class UserCartController {
  constructor(private readonly userCartService: UserCartService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  getMyCart(@CurrentUser() user: User) {
    return this.userCartService.findCartByUserId(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cart by ID' })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.userCartService.findOne(id, user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  addItemToCart(
    @CurrentUser() user: User,
    @Body() createCartItemDto: CreateCartItemDto
  ) {
    return this.userCartService.addItemToCart(user.id, createCartItemDto);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Cart item updated successfully' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  updateCartItem(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCartItemDto: UpdateCartItemDto
  ) {
    return this.userCartService.updateCartItem(user.id, id, updateCartItemDto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({
    status: 200,
    description: 'Item removed from cart successfully'
  })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  removeItemFromCart(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.userCartService.removeItemFromCart(user.id, id);
  }

  @Delete('me/clear')
  @ApiOperation({ summary: 'Clear current user cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  clearCart(@CurrentUser() user: User) {
    return this.userCartService.clearCart(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete cart' })
  @ApiResponse({ status: 200, description: 'Cart deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.userCartService.remove(id, user.id);
  }
}
