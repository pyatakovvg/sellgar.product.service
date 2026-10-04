import { Injectable } from '@nestjs/common';

import { CreateImageDto } from '../repository/dto/create-image.dto';
import { UpdateImageDto } from '../repository/dto/update-image.dto';

import { ImageRepository } from '../repository/image.repository';

@Injectable()
export class ImageService {
  constructor(private readonly imageRepository: ImageRepository) {}

  create(dto: CreateImageDto) {
    return this.imageRepository.create(dto);
  }

  update(dto: UpdateImageDto) {
    return this.imageRepository.update(dto);
  }
}
