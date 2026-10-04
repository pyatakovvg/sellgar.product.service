import { Injectable, NotFoundException } from '@nestjs/common';

import { Image } from '../../domain/image';
import { CreateImageCommand } from '../command/create-image.command';
import { UpdateImageCommand } from '../command/update-image.command';
import { ImageRepository } from '../port/image.repository';
import { GetImageQuery } from '../query/get-image.query';

@Injectable()
export class ImageService {
  constructor(private readonly imageRepository: ImageRepository) {}

  create(command: CreateImageCommand): Promise<void> {
    return this.imageRepository.insertIfAbsent(new Image(command.uuid, command.name, 1));
  }

  update(command: UpdateImageCommand): Promise<void> {
    return this.imageRepository.upsertIfNewer(new Image(command.uuid, command.name, command.version + 1));
  }

  async getByUuid(query: GetImageQuery): Promise<Image> {
    const image = await this.imageRepository.findByUuid(query.uuid);
    if (!image) {
      throw new NotFoundException(`Image ${query.uuid} not found`);
    }
    return image;
  }
}
