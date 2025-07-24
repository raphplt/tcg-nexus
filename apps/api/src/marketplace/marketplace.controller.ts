import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  UseGuards
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { FindAllListingsQuery } from './dto/ind-all-listings-query.dto';
import { UpdateListingDto } from './dto/update-marketplace.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from 'src/user/entities/user.entity';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('listings')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  createListing(@Body() createListingDto: CreateListingDto) {
    return this.marketplaceService.create(createListingDto);
  }

  @Get()
  getAllListings(@Query() query: FindAllListingsQuery) {
    return this.marketplaceService.findAll(query);
  }

  @Get(':id')
  getListingById(@Param('id') id: string) {
    return this.marketplaceService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateListing(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @CurrentUser() user: User
  ) {
    return this.marketplaceService.update(+id, updateListingDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteListing(@Param('id') id: string, @CurrentUser() user: User) {
    return this.marketplaceService.delete(+id, user);
  }
}
