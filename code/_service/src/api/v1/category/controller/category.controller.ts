import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreateCategoryDto } from '../repository/dto/create-category.dto';
import { UpdateCategoryDto } from '../repository/dto/update-category.dto';

import { CategoryService } from '../service/category.service';

@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @MessagePattern({ cmd: 'category.findAll' })
  findAll() {
    return this.categoryService.findAll();
  }

  @MessagePattern({ cmd: 'category.findByUuid' })
  findByUuid(@Payload('uuid') uuid: string) {
    return this.categoryService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'category.create' })
  create(@Payload() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @MessagePattern({ cmd: 'category.update' })
  update(@Payload() dto: UpdateCategoryDto) {
    return this.categoryService.update(dto);
  }

  @MessagePattern({ cmd: 'category.delete' })
  remove(@Payload('uuid') uuid: string) {
    return this.categoryService.remove(uuid);
  }
}
