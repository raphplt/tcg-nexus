import { Injectable } from '@nestjs/common';
import { CreateListingDto } from './dto/create-marketplace.dto';
import { UpdateListingDto } from './dto/update-marketplace.dto';

@Injectable()
export class MarketplaceService {
  create(createMarketplaceDto: CreateListingDto) {
    return 'This action adds a new marketplace';
  }

  findAll() {
    return `This action returns all marketplace`;
  }

  findOne(id: number) {
    return `This action returns a #${id} marketplace`;
  }

  update(id: number, updateMarketplaceDto: UpdateListingDto) {
    return `This action updates a #${id} marketplace`;
  }

  remove(id: number) {
    return `This action removes a #${id} marketplace`;
  }
}
