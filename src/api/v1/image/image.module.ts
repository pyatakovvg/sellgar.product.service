import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImageService } from './service/image.service';
import { ImageRepository } from './repository/image.repository';
import { ImageController } from './controller/image.controller';

import { ImageModel } from './image.model';

@Module({
  imports: [TypeOrmModule.forFeature([ImageModel])],
  controllers: [ImageController],
  providers: [ImageService, ImageRepository],
})
export class ImageModule {}
