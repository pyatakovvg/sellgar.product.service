import { Injectable } from '@nestjs/common';

import { CreateBrandDto } from '../repository/dto/create-brand.dto';
import { UpdateBrandDto } from '../repository/dto/update-brand.dto';

import { BrandRepository } from '../repository/brand.repository';

@Injectable()
export class BrandService {
  constructor(private readonly brandRepository: BrandRepository) {}

  async findAll() {
    return Promise.all([this.brandRepository.findAll(), this.brandRepository.count()]).then(([data, count]) => {
      return {
        data: data,
        meta: {
          totalRows: count,
        },
      };
    });
  }

  findByUuid(uuid: string) {
    return this.brandRepository.findByUuid(uuid);
  }

  create(dto: CreateBrandDto) {
    return this.brandRepository.create(dto);
  }

  update(dto: UpdateBrandDto) {
    return this.brandRepository.update(dto);
  }

  remove(uuid: string) {
    return `This action removes a #${uuid} category`;
  }
}
