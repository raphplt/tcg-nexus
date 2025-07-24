import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { UpdateListingDto } from './dto/update-marketplace.dto';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post()
  create(@Body() createMarketplaceDto: CreateListingDto) {
    return this.marketplaceService.create(createMarketplaceDto);
  }

  @Get()
  findAll() {
    return this.marketplaceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marketplaceService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMarketplaceDto: UpdateListingDto
  ) {
    return this.marketplaceService.update(+id, updateMarketplaceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.marketplaceService.remove(+id);
  }
}
