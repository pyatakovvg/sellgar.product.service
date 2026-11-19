import { Injectable } from '@nestjs/common';

import { CreateCategoryDto } from '../repository/dto/create-category.dto';
import { UpdateCategoryDto } from '../repository/dto/update-category.dto';

import { CategoryRepository } from '../repository/category.repository';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  create(createCategoryDto: CreateCategoryDto) {
    return this.categoryRepository.create(createCategoryDto);
  }

  async findAll() {
    return Promise.all([this.categoryRepository.findAll()]).then(([data]) => {
      return {
        data: data,
        meta: {},
      };
    });
  }

  findByUuid(uuid: string) {
    return this.categoryRepository.findByUuid(uuid);
  }

  update(dto: UpdateCategoryDto) {
    return this.categoryRepository.update(dto);
  }

  remove(uuid: string) {
    return `This action removes a #${uuid} category`;
  }
}
