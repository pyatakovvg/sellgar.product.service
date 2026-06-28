import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

// import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CatalogStatus } from '../../catalog/catalog-status.enum';
import { VariantModel } from '../variant.model';
import { VariantEntity } from '../variant.entity';
import { AddVariantImageDto } from './dto/add-variant-image.dto';
import { ImageModel } from '../../image/image.model';
import { VariantImageModel } from '../variant-image.model';

@Injectable()
export class VariantRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count() {
    return this.dataSource
      .createQueryBuilder(VariantModel, 'variant')
      .where('variant.status != :archivedStatus', { archivedStatus: CatalogStatus.Archived })
      .getCount();
  }

  async findAll() {
    const result = await this.dataSource
      .createQueryBuilder(VariantModel, 'variant')
      .leftJoinAndSelect('variant.properties', 'properties')
      .leftJoinAndSelect('properties.property', 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .leftJoinAndSelect('variant.images', 'images')
      .leftJoinAndSelect('images.image', 'image')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants', 'variants.status != :archivedVariantStatus', {
        archivedVariantStatus: CatalogStatus.Archived,
      })
      .where('variant.status != :archivedStatus', { archivedStatus: CatalogStatus.Archived })
      .orderBy('product.createdAt', 'DESC')
      .addOrderBy('variant.createdAt', 'ASC')
      .addOrderBy('properties.order', 'ASC')
      .addOrderBy('images.sortOrder', 'ASC')
      .getMany();

    const resultInstance = result.map((entity) =>
      plainToInstance(VariantEntity, entity, {
        strategy: 'excludeAll',
      }),
    );

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder(VariantModel, 'variant')
      .leftJoinAndSelect('variant.properties', 'properties')
      .leftJoinAndSelect('properties.property', 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .leftJoinAndSelect('variant.images', 'images')
      .leftJoinAndSelect('images.image', 'image')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .where('variant.uuid = :uuid', { uuid })
      .andWhere('variant.status != :archivedStatus', { archivedStatus: CatalogStatus.Archived })
      .orderBy('variant.createdAt', 'ASC')
      .addOrderBy('properties.order', 'ASC')
      .addOrderBy('images.sortOrder', 'ASC')
      .getOneOrFail();

    const resultInstance = plainToInstance(VariantEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create() {
    // const result = await this.prismaService.product.create({
    //   data: {
    //     name: dto.name,
    //     description: dto.description,
    //     categoryUuid: dto.categoryUuid,
    //     brandUuid: dto.brandUuid,
    //     variants: {
    //       create: dto.variants.map((v) => ({
    //         name: v.name,
    //         description: v.description,
    //         prices: {
    //           create: {
    //             price: 0,
    //             currencyCode: 'RUB',
    //           },
    //         },
    //       })),
    //     },
    //   },
    //   select: this.productVariantSelect,
    // });
    // const resultInstance = plainToInstance(ProductVariantEntity, result, {
    //   strategy: 'excludeAll',
    // });
    //
    // await validateOrReject(resultInstance);
    //
    // return resultInstance;
  }

  async update() {
    // const result = await this.prismaService.product.update({
    //   where: {
    //     uuid,
    //   },
    //   data: {
    //     name: dto.name,
    //     description: dto.description,
    //     categoryUuid: dto.categoryUuid,
    //     brandUuid: dto.brandUuid,
    //     variants: {
    //       deleteMany: {
    //         NOT: dto.variants.map((v) => ({ uuid: v.uuid })),
    //       },
    //       create: dto.variants
    //         .filter((v) => !v.uuid)
    //         .map((v) => ({
    //           name: v.name,
    //           description: v.description,
    //           prices: {
    //             create: {
    //               price: v.price.price,
    //               currencyCode: 'RUB',
    //             },
    //           },
    //         })),
    //       update: dto.variants
    //         .filter((v) => !!v.uuid)
    //         .map((v) => ({
    //           where: {
    //             uuid: v.uuid,
    //           },
    //           data: {
    //             uuid: v.uuid,
    //             name: v.name,
    //             description: v.description,
    //             prices: {
    //               create: {
    //                 price: v.price.price,
    //                 currencyCode: 'RUB',
    //               },
    //             },
    //           },
    //         })),
    //     },
    //   },
    //   select: this.productVariantSelect,
    // });
    // const resultInstance = plainToInstance(ProductVariantEntity, result, {
    //   strategy: 'excludeAll',
    // });
    //
    // await validateOrReject(resultInstance);
    //
    // return resultInstance;
  }

  async addImage(dto: AddVariantImageDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const variantExists = await runner.manager
        .createQueryBuilder(VariantModel, 'variant')
        .where('variant.uuid = :uuid', { uuid: dto.variantUuid })
        .andWhere('variant.status != :archivedStatus', { archivedStatus: CatalogStatus.Archived })
        .getExists();

      if (!variantExists) {
        throw new NotFoundException(`Variant ${dto.variantUuid} not found`);
      }

      const imageExists = await runner.manager
        .createQueryBuilder(ImageModel, 'image')
        .where('image.uuid = :uuid', { uuid: dto.imageUuid })
        .getExists();

      if (!imageExists) {
        if (!dto.fileName) {
          throw new NotFoundException(`Image ${dto.imageUuid} not found`);
        }

        await runner.manager
          .createQueryBuilder()
          .insert()
          .into(ImageModel)
          .values({
            uuid: dto.imageUuid,
            fileName: dto.fileName,
          })
          .execute();
      }

      const existing = await runner.manager
        .createQueryBuilder(VariantImageModel, 'variantImage')
        .where('variantImage.variantUuid = :variantUuid', { variantUuid: dto.variantUuid })
        .andWhere('variantImage.imageUuid = :imageUuid', { imageUuid: dto.imageUuid })
        .getOne();

      const hasImages = await runner.manager
        .createQueryBuilder(VariantImageModel, 'variantImage')
        .where('variantImage.variantUuid = :variantUuid', { variantUuid: dto.variantUuid })
        .getExists();

      const shouldBePrimary = dto.isPrimary ?? !hasImages;

      if (shouldBePrimary) {
        await runner.manager
          .createQueryBuilder()
          .update(VariantImageModel)
          .set({ isPrimary: false })
          .where('variant_uuid = :variantUuid', { variantUuid: dto.variantUuid })
          .execute();
      }

      const sortOrder =
        dto.sortOrder ??
        existing?.sortOrder ??
        ((await runner.manager
          .createQueryBuilder(VariantImageModel, 'variantImage')
          .where('variantImage.variantUuid = :variantUuid', { variantUuid: dto.variantUuid })
          .select('COALESCE(MAX(variantImage.sortOrder), -1)', 'max')
          .getRawOne()
          .then((row) => Number(row.max))) + 1);

      if (existing) {
        await runner.manager
          .createQueryBuilder()
          .update(VariantImageModel)
          .set({
            sortOrder,
            isPrimary: shouldBePrimary,
            alt: dto.alt ?? existing.alt,
          })
          .where('uuid = :uuid', { uuid: existing.uuid })
          .execute();
      } else {
        await runner.manager
          .createQueryBuilder()
          .insert()
          .into(VariantImageModel)
          .values({
            variantUuid: dto.variantUuid,
            imageUuid: dto.imageUuid,
            sortOrder,
            isPrimary: shouldBePrimary,
            alt: dto.alt ?? null,
          })
          .execute();
      }

      await runner.commitTransaction();

      return this.findByUuid(dto.variantUuid);
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async removeImage(variantUuid: string, imageUuid: string) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const existing = await runner.manager
        .createQueryBuilder(VariantImageModel, 'variantImage')
        .where('variantImage.variantUuid = :variantUuid', { variantUuid })
        .andWhere('variantImage.imageUuid = :imageUuid', { imageUuid })
        .getOne();

      if (!existing) {
        throw new NotFoundException(`Image ${imageUuid} is not attached to variant ${variantUuid}`);
      }

      await runner.manager
        .createQueryBuilder()
        .delete()
        .from(VariantImageModel)
        .where('uuid = :uuid', { uuid: existing.uuid })
        .execute();

      if (existing.isPrimary) {
        const nextPrimary = await runner.manager
          .createQueryBuilder(VariantImageModel, 'variantImage')
          .where('variantImage.variantUuid = :variantUuid', { variantUuid })
          .orderBy('variantImage.sortOrder', 'ASC')
          .getOne();

        if (nextPrimary) {
          await runner.manager
            .createQueryBuilder()
            .update(VariantImageModel)
            .set({ isPrimary: true })
            .where('uuid = :uuid', { uuid: nextPrimary.uuid })
            .execute();
        }
      }

      await runner.commitTransaction();

      return this.findByUuid(variantUuid);
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async detachImage(imageUuid: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .delete()
      .from(VariantImageModel)
      .where('image_uuid = :imageUuid', { imageUuid })
      .execute();

    return {
      affected: result.affected ?? 0,
    };
  }
}
