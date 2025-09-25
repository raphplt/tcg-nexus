import { Injectable } from '@nestjs/common';

@Injectable()
export class CollectionService {
  create() {
    return 'This action adds a new collection';
  }

  findAll() {
    return `This action returns all collection`;
  }

  findOne(id: number) {
    return `This action returns a #${id} collection`;
  }

  update(id: number) {
    return `This action updates a #${id} collection`;
  }

  remove(id: number) {
    return `This action removes a #${id} collection`;
  }
}
