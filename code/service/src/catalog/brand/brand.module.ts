import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageModel } from '../image/infrastructure/persistence/model/image.model';
import { BrandController } from './controller/brand.controller';
import { BrandCommandMapper } from './controller/mapper/brand-command.mapper';
import { BrandImageModel } from './brand-image.model';
import { BrandModel } from './brand.model';
import { BrandRepository } from './repository/brand.repository';
import { BrandService } from './service/brand.service';
import { BrandImageOutboxService } from './service/brand-image-outbox.service';

@Module({
  imports: [TypeOrmModule.forFeature([BrandModel, BrandImageModel, ImageModel])],
  controllers: [BrandController],
  providers: [BrandCommandMapper, BrandRepository, BrandService, BrandImageOutboxService],
  exports: [BrandRepository, BrandService, TypeOrmModule],
})
export class BrandModule {}
