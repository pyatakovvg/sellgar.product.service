import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource, EntityManager } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CategoryImageDto, CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { CategoryEntity } from '../category.entity';
import { CategoryModel } from '../category.model';
import { CategoryClosureModel } from '../category-closure.model';
import { CategoryImageModel } from '../category-image.model';
import { ImageModel } from '../../image/image.model';

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
        image: await this.findCategoryImage(this.dataSource.manager, result.descendant.uuid),
        parentUuid: null,
        parent: null,
      };
    }

    return {
      ...result.descendant,
      image: await this.findCategoryImage(this.dataSource.manager, result.descendant.uuid),
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
      const categoryImages = await this.dataSource
        .createQueryBuilder(CategoryImageModel, 'categoryImage')
        .leftJoinAndSelect('categoryImage.image', 'image')
        .orderBy('categoryImage.sortOrder', 'ASC')
        .getMany();
      const categoryImagesByCategoryUuid = new Map<string, CategoryImageModel>();

      categoryImages.forEach((image) => {
        if (!categoryImagesByCategoryUuid.has(image.categoryUuid)) {
          categoryImagesByCategoryUuid.set(image.categoryUuid, image);
        }
      });

      allCategories.forEach((category) => {
        categoryMap.set(category.uuid, {
          ...category,
          image: categoryImagesByCategoryUuid.get(category.uuid) ?? null,
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

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(CategoryModel)
        .values({
          uuid: newUuid,
          code: newUuid,
          name: dto.name,
          description: dto.description,
          order: Number(maxOrderResult?.order ?? -1) + 1,
        })
        .execute();

      await this.syncCategoryImage(runner.manager, newUuid, dto.image);

      const createdCategory = await runner.manager
        .createQueryBuilder(CategoryModel, 'category')
        .select()
        .where('category.uuid = :uuid', { uuid: newUuid })
        .getOneOrFail();

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

      const isRoot = newCategory.ancestor.uuid === newCategory.descendant.uuid;
      const category = plainToInstance(CategoryEntity, {
        ...newCategory.descendant,
        image: await this.findCategoryImage(runner.manager, newUuid),
        parentUuid: isRoot ? null : newCategory.ancestor.uuid,
        parent: isRoot ? null : newCategory.ancestor,
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
      const category = await runner.manager
        .createQueryBuilder(CategoryModel, 'category')
        .setLock('pessimistic_write')
        .where('category.uuid = :uuid', { uuid: dto.uuid })
        .getOne();

      if (!category) {
        throw new NotFoundException(`Category ${dto.uuid} not found`);
      }

      if (category.version !== dto.version) {
        throw new ConflictException(`Category ${dto.uuid} was changed by another request`);
      }

      let parentUuid = category.uuid;

      if (dto.parentUuid) {
        const newParent = await runner.manager.findOne(CategoryModel, {
          where: { uuid: dto.parentUuid },
        });

        if (!newParent) {
          throw new NotFoundException(`Category parent ${dto.parentUuid} not found`);
        }

        const isCircular = await runner.manager
          .createQueryBuilder(CategoryClosureModel, 'closure')
          .where('closure.ancestorId = :uuid AND closure.descendantId = :newParentUuid', {
            uuid: category.uuid,
            newParentUuid: newParent.uuid,
          })
          .getExists();

        if (isCircular) {
          throw new BadRequestException('Category cannot be moved under its descendant');
        }

        parentUuid = newParent.uuid;
      }

      await runner.manager
        .createQueryBuilder()
        .update(CategoryModel)
        .set({
          name: dto.name,
          description: dto.description,
          version: () => 'version + 1',
        })
        .where('uuid = :uuid', { uuid: category.uuid })
        .andWhere('version = :version', { version: dto.version })
        .execute();

      await this.syncCategoryImage(runner.manager, category.uuid, dto.image);

      await runner.manager
        .createQueryBuilder()
        .update(CategoryClosureModel)
        .set({
          ancestorId: parentUuid,
          descendantId: category.uuid,
        })
        .where('descendantId = :uuid', { uuid: category.uuid })
        .execute();

      const newCategory = await runner.manager
        .createQueryBuilder(CategoryClosureModel, 'closure')
        .innerJoinAndSelect('closure.descendant', 'descendant')
        .innerJoinAndSelect('closure.ancestor', 'ancestor')
        .where('closure.descendantId = :uuid', { uuid: category.uuid })
        .getOneOrFail();

      const isRoot = newCategory.ancestor.uuid === newCategory.descendant.uuid;
      const updatedCategory = plainToInstance(CategoryEntity, {
        ...newCategory.descendant,
        image: await this.findCategoryImage(runner.manager, category.uuid),
        parentUuid: isRoot ? null : newCategory.ancestor.uuid,
        parent: isRoot ? null : newCategory.ancestor,
      });

      await validateOrReject(updatedCategory);

      await runner.commitTransaction();

      return updatedCategory;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  remove(uuid: string) {
    return `This action removes a #${uuid} category`;
  }

  private async findCategoryImage(manager: EntityManager, categoryUuid: string) {
    return await manager
      .createQueryBuilder(CategoryImageModel, 'categoryImage')
      .leftJoinAndSelect('categoryImage.image', 'image')
      .where('categoryImage.categoryUuid = :categoryUuid', { categoryUuid })
      .orderBy('categoryImage.sortOrder', 'ASC')
      .getOne();
  }

  private async syncCategoryImage(manager: EntityManager, categoryUuid: string, image?: CategoryImageDto | null) {
    await manager
      .createQueryBuilder()
      .delete()
      .from(CategoryImageModel)
      .where('category_uuid = :categoryUuid', { categoryUuid })
      .execute();

    if (!image?.imageUuid) {
      return;
    }

    await this.ensureImage(manager, image.imageUuid, image.fileName);

    await manager
      .createQueryBuilder()
      .insert()
      .into(CategoryImageModel)
      .values({
        uuid: uuid.v4(),
        categoryUuid,
        imageUuid: image.imageUuid,
        sortOrder: 0,
        isPrimary: true,
        alt: image.alt ?? null,
      })
      .execute();
  }

  private async ensureImage(manager: EntityManager, imageUuid: string, fileName?: string) {
    const imageExists = await manager
      .createQueryBuilder(ImageModel, 'image')
      .where('image.uuid = :uuid', { uuid: imageUuid })
      .getExists();

    if (imageExists) {
      return;
    }

    if (!fileName) {
      throw new NotFoundException(`Image ${imageUuid} not found`);
    }

    await manager
      .createQueryBuilder()
      .insert()
      .into(ImageModel)
      .values({
        uuid: imageUuid,
        fileName,
      })
      .execute();
  }
}
