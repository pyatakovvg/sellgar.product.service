import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ShopService } from './service/shop.service';
import { ShopRepository } from './repository/shop.repository';
import { ShopController } from './controller/shop.controller';

import { ShopModel } from './shop.model';

@Module({
  imports: [TypeOrmModule.forFeature([ShopModel])],
  controllers: [ShopController],
  providers: [ShopService, ShopRepository],
})
export class ShopModule {}
