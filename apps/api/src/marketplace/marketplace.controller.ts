import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards,
  ParseIntPipe
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindAllListingsQuery } from './dto/ind-all-listings-query.dto';
import { UpdateListingDto } from './dto/update-marketplace.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from 'src/user/entities/user.entity';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';
import { UserRole } from 'src/common/enums/user';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Post('listings')
  @Roles('pro')
  createListing(
    @Body() createListingDto: CreateListingDto,
    @CurrentUser() user: User
  ) {
    return this.marketplaceService.create(createListingDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('orders')
  createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: User
  ) {
    return this.marketplaceService.createOrder(createOrderDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('orders')
  getMyOrders(@CurrentUser() user: User) {
    return this.marketplaceService.findOrdersByBuyerId(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('orders/:id')
  getOrderById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.marketplaceService.findOrderById(+id, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/orders')
  getAllOrders(@Query() query: AdminOrderQueryDto) {
    return this.marketplaceService.findAllOrders(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Get('admin/orders/:id')
  getOrderAsAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.marketplaceService.findOrderByIdAsAdmin(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Patch('admin/orders/:id/status')
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto
  ) {
    return this.marketplaceService.updateOrderStatus(id, dto.status);
  }

  @Get('listings')
  @Public()
  getAllListings(@Query() query: FindAllListingsQuery) {
    return this.marketplaceService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('listings/my-listings')
  getMyListings(@CurrentUser() user: User) {
    return this.marketplaceService.findBySellerId(user.id);
  }

  @Get('listings/:id')
  @Public()
  getListingById(@Param('id') id: string) {
    return this.marketplaceService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('listings/:id')
  updateListing(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @CurrentUser() user: User
  ) {
    return this.marketplaceService.update(+id, updateListingDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('listings/:id')
  deleteListing(@Param('id') id: string, @CurrentUser() user: User) {
    return this.marketplaceService.delete(+id, user);
  }

  @Get('cards')
  @Public()
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'setId', required: false, type: String })
  @ApiQuery({ name: 'serieId', required: false, type: String })
  @ApiQuery({ name: 'rarity', required: false, type: String })
  @ApiQuery({ name: 'currency', required: false, type: String })
  @ApiQuery({ name: 'cardState', required: false, type: String })
  @ApiQuery({ name: 'priceMin', required: false, type: Number })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  getCardsWithMarketplaceData(
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      setId?: string;
      serieId?: string;
      rarity?: string;
      currency?: string;
      cardState?: string;
      priceMin?: number;
      priceMax?: number;
      sortBy?: string;
      sortOrder?: 'ASC' | 'DESC';
    }
  ) {
    return this.marketplaceService.getCardsWithMarketplaceData(query);
  }

  @Get('cards/:id/stats')
  @Public()
  @ApiQuery({ name: 'currency', required: false, type: String })
  @ApiQuery({ name: 'cardState', required: false, type: String })
  getCardStatistics(
    @Param('id') id: string,
    @Query('currency') currency?: string,
    @Query('cardState') cardState?: string
  ) {
    return this.marketplaceService.getCardStatistics(id, currency, cardState);
  }

  // Meilleurs vendeurs
  @Get('best-sellers')
  @Public()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getBestSellers(@Query('limit') limit?: number) {
    return this.marketplaceService.getBestSellers(limit ? +limit : 10);
  }

  // Vendeurs
  @Get('sellers/:id')
  @Public()
  getSellerStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.marketplaceService.getSellerStatistics(id);
  }

  @Get('sellers/:id/listings')
  @Public()
  getSellerListings(@Param('id', ParseIntPipe) id: number) {
    return this.marketplaceService.findBySellerId(id);
  }
}
