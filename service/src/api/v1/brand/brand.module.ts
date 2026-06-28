import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BrandService } from './service/brand.service';
import { BrandRepository } from './repository/brand.repository';
import { BrandController } from './controller/brand.controller';

import { BrandModel } from './brand.model';

@Module({
  imports: [TypeOrmModule.forFeature([BrandModel])],
  controllers: [BrandController],
  providers: [BrandService, BrandRepository],
})
export class BrandModule {}
