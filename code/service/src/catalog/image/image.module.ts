import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImageRepository } from './application/port/image.repository';
import { ImageService } from './application/service/image.service';
import { ImageModel } from './infrastructure/persistence/model/image.model';
import { TypeOrmImageRepository } from './infrastructure/persistence/repository/typeorm-image.repository';
import { ImageController } from './presentation/rmq/image.controller';
import { ImageQueryMapper } from './presentation/rmq/mapper/image-query.mapper';
import { ImageEventConsumerService } from './application/service/image-event-consumer.service';
import { ImageProjectionWriter } from './infrastructure/persistence/image-projection.writer';

@Module({
  imports: [TypeOrmModule.forFeature([ImageModel])],
  controllers: [ImageController],
  providers: [
    ImageService,
    ImageEventConsumerService,
    ImageQueryMapper,
    ImageProjectionWriter,
    { provide: ImageRepository, useClass: TypeOrmImageRepository },
  ],
  exports: [TypeOrmModule, ImageService],
})
export class ImageModule {}
