import { Injectable } from '@nestjs/common';

@Injectable()
export class StatisticsService {
  create() {
    return 'This action adds a new statistic';
  }

  findAll() {
    return `This action returns all statistics`;
  }

  findOne(id: number) {
    return `This action returns a #${id} statistic`;
  }

  update(id: number) {
    return `This action updates a #${id} statistic`;
  }

  remove(id: number) {
    return `This action removes a #${id} statistic`;
  }
}
