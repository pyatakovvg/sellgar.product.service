import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImageRepository } from './application/port/image.repository';
import { ImageService } from './application/service/image.service';
import { ImageModel } from './infrastructure/persistence/model/image.model';
import { TypeOrmImageRepository } from './infrastructure/persistence/repository/typeorm-image.repository';
import { ImageController } from './presentation/rmq/image.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ImageModel])],
  controllers: [ImageController],
  providers: [
    ImageService,
    { provide: ImageRepository, useClass: TypeOrmImageRepository },
  ],
  exports: [TypeOrmModule, ImageService],
})
export class ImageModule {}
