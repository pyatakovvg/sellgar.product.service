import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';

import { CreateImageCommand } from '../../application/command/create-image.command';
import { UpdateImageCommand } from '../../application/command/update-image.command';
import { GetImageQuery } from '../../application/query/get-image.query';
import { ImageService } from '../../application/service/image.service';
import { Image } from '../../domain/image';
import { FileCreatedEventDto } from './dto/file-created-event.dto';
import { FileUpdatedEventDto } from './dto/file-updated-event.dto';
import { GetImageQueryDto } from './dto/get-image-query.dto';

@Controller()
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @EventPattern('file_srv.file.create')
  create(@Payload() dto: FileCreatedEventDto): Promise<void> {
    return this.imageService.create(new CreateImageCommand(dto.uuid, dto.name));
  }

  @EventPattern('file_srv.file.update')
  update(@Payload() dto: FileUpdatedEventDto): Promise<void> {
    return this.imageService.update(new UpdateImageCommand(dto.uuid, dto.name, dto.version));
  }

  @MessagePattern({ cmd: 'catalog.v2.image.getByUuid' })
  getByUuid(@Payload() dto: GetImageQueryDto): Promise<Image> {
    return this.imageService.getByUuid(new GetImageQuery(dto.uuid));
  }
}
