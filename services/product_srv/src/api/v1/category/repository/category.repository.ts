import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { CategoryEntity } from '../category.entity';
import { CategoryModel } from '../category.model';
import { CategoryClosureModel } from '../category-closure.model';

@Injectable()
export class CategoryRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findByUuid(uuid: string) {
    const builder = this.dataSource
      .createQueryBuilder(CategoryClosureModel, 'closure')
      .innerJoinAndSelect('closure.descendant', 'descendant')
      .innerJoinAndSelect('closure.ancestor', 'ancestor')
      .where('closure.descendantId = :uuid', { uuid });

    const result = await builder.getOneOrFail();

    if (result.descendant.uuid === result.ancestor.uuid) {
      return {
        ...result.descendant,
        parentUuid: null,
        parent: null,
      };
    }

    return {
      ...result.descendant,
      parentUuid: result.ancestor.uuid,
      parent: result.ancestor,
    };
  }

  async findAll() {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const roots: CategoryEntity[] = [];
      const categoryMap = new Map<string, CategoryEntity>();

      const categoriesWithParents = await this.dataSource
        .createQueryBuilder(CategoryClosureModel, 'closure')
        .innerJoinAndSelect('closure.descendant', 'descendant')
        .innerJoinAndSelect('closure.ancestor', 'ancestor')
        .orderBy('ancestor.order', 'ASC') // Сначала сортируем по order родителя
        .addOrderBy('descendant.order', 'ASC') // Затем по order потомка
        .getMany();

      const allCategories = await this.dataSource.createQueryBuilder(CategoryModel, 'category').getMany();

      allCategories.forEach((category) => {
        categoryMap.set(category.uuid, {
          ...category,
          children: [],
        });
      });

      categoriesWithParents.forEach((closure) => {
        if (closure.ancestor.uuid === closure.descendant.uuid) {
          const root = categoryMap.get(closure.descendantId);

          if (root) {
            roots.push({ ...root, parent: null, parentUuid: null });
          }
        } else {
          const parent = categoryMap.get(closure.ancestorId);
          const child = categoryMap.get(closure.descendantId);

          if (parent && child) {
            parent.children.push(child);
          }
        }
      });

      await runner.commitTransaction();

      return roots;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async create(dto: CreateCategoryDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      const builder = runner.manager.createQueryBuilder(CategoryModel, 'category');

      if (dto.parentUuid) {
        builder
          .select('MAX(category.order)', 'order')
          .leftJoin(CategoryClosureModel, 'closure', 'closure.descendantId = category.uuid')
          .where('closure.ancestorId = :parentUuid', {
            parentUuid: dto.parentUuid,
          });
      } else {
        builder
          .select('MAX(category.order)', 'order')
          .leftJoin(CategoryClosureModel, 'closure', 'closure.descendantId = category.uuid')
          .where('closure.ancestorId = closure.descendantId');
      }

      const maxOrderResult = await builder.getRawOne();

      console.log('maxOrderResult', maxOrderResult);

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(CategoryModel)
        .values({
          uuid: newUuid,
          code: 'dto.code',
          name: dto.name,
          description: dto.description,
          order: maxOrderResult ? maxOrderResult.order + 1 : 0,
        })
        .execute();

      console.log('created');

      const createdCategory = await runner.manager
        .createQueryBuilder(CategoryModel, 'category')
        .select()
        .where('category.uuid = :uuid', { uuid: newUuid })
        .getOneOrFail();

      console.log('createdCategory', createdCategory);

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(CategoryClosureModel)
        .values({
          ancestorId: dto.parentUuid ? dto.parentUuid : createdCategory.uuid,
          descendantId: createdCategory.uuid,
        })
        .execute();

      const newCategory = await runner.manager
        .createQueryBuilder(CategoryClosureModel, 'closure')
        .innerJoinAndSelect('closure.descendant', 'descendant')
        .innerJoinAndSelect('closure.ancestor', 'ancestor')
        .where('closure.descendantId = :uuid', { uuid: newUuid })
        .getOneOrFail();

      const category = plainToInstance(CategoryEntity, {
        ...newCategory.descendant,
        parentUuid: newCategory.ancestor.uuid,
        parent: newCategory.ancestor,
      });

      await validateOrReject(category);

      await runner.commitTransaction();

      return category;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async update(dto: UpdateCategoryDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const [category, newParent] = await Promise.all([
        runner.manager.findOne(CategoryModel, {
          where: { uuid: dto.uuid },
        }),
        runner.manager.findOne(CategoryModel, {
          where: { uuid: dto.parentUuid },
        }),
      ]);

      const isCircular = await runner.manager
        .createQueryBuilder(CategoryClosureModel, 'closure')
        .where('closure.ancestorId = :uuid AND closure.descendantId = :newParentUuid', {
          uuid: category.uuid,
          newParentUuid: newParent.uuid,
        })
        .getExists();

      await runner.manager
        .createQueryBuilder()
        .update(CategoryModel)
        .set({
          name: dto.name,
          description: dto.description,
        })
        .where('uuid = :uuid', { uuid: category.uuid })
        .execute();

      if (!isCircular) {
        await runner.manager
          .createQueryBuilder()
          .update(CategoryClosureModel)
          .set({
            ancestorId: newParent.uuid,
            descendantId: category.uuid,
          })
          .where('descendantId = :uuid', { uuid: category.uuid })
          .execute();
      }

      const newCategory = await runner.manager
        .createQueryBuilder(CategoryClosureModel, 'closure')
        .innerJoinAndSelect('closure.descendant', 'descendant')
        .innerJoinAndSelect('closure.ancestor', 'ancestor')
        .where('closure.descendantId = :uuid', { uuid: category.uuid })
        .getOneOrFail();

      const updatedCategory = plainToInstance(CategoryEntity, {
        ...newCategory.descendant,
        parentUuid: newCategory.ancestor.uuid,
        parent: newCategory.ancestor,
      });

      console.log('category', updatedCategory);

      await runner.commitTransaction();

      return updatedCategory;
    } catch (error) {
      console.error(error);
      await runner.rollbackTransaction();
    } finally {
      await runner.release();
    }
    // return this.prismaService.category.update({
    //   where: {
    //     uuid: dto.uuid,
    //   },
    //   data: {
    //     uuid: dto.uuid,
    //     parentUuid: dto.parentUuid,
    //     name: dto.name,
    //     description: dto.description,
    //   },
    // });
  }

  remove(uuid: string) {
    return `This action removes a #${uuid} category`;
  }
}
