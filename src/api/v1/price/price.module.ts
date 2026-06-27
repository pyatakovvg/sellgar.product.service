import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PriceService } from './service/price.service';
import { PriceRepository } from './repository/price.repository';
import { PriceController } from './controller/price.controller';

import { PriceModel } from './price.model';

@Module({
  imports: [TypeOrmModule.forFeature([PriceModel])],
  controllers: [PriceController],
  providers: [PriceService, PriceRepository],
})
export class PriceModule {}
