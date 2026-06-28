import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoryService } from './service/category.service';
import { CategoryRepository } from './repository/category.repository';
import { CategoryController } from './controller/category.controller';

import { CategoryModel } from './category.model';
import { CategoryClosureModel } from './category-closure.model';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryModel, CategoryClosureModel])],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepository],
})
export class CategoryModule {}
