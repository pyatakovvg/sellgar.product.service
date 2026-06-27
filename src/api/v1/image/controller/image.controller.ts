import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

import { CreateImageDto } from '../repository/dto/create-image.dto';
import { UpdateImageDto } from '../repository/dto/update-image.dto';

import { ImageService } from '../service/image.service';

@Controller()
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @EventPattern('file_srv.file.create')
  async create(@Payload() dto: CreateImageDto) {
    await this.imageService.create(dto);
  }

  @EventPattern('file_srv.file.update')
  async update(@Payload() dto: UpdateImageDto) {
    await this.imageService.update(dto);
  }
}
