import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { ProductModel } from '../product.model';

import { ProductEntity } from '../product.entity';
import { VariantModel } from '../../variant/variant.model';
import { VariantPropertyModel } from '../../variant/variant-property.model';

@Injectable()
export class ProductRepository {
  constructor(
    @Inject('PRODUCT_EVENT_SERVICE') private readonly productProxy: ClientProxy,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  count() {
    return this.dataSource.createQueryBuilder(ProductModel, 'product').getCount();
  }

  async findAll() {
    const result = await this.dataSource
      .createQueryBuilder(ProductModel, 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('variants.properties', 'properties')
      .leftJoinAndSelect('properties.property', 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .orderBy('product.createdAt', 'DESC')
      .addOrderBy('variants.createdAt', 'ASC')
      .addOrderBy('properties.order', 'ASC')
      .getMany();

    const resultInstance = result.map((entity) =>
      plainToInstance(ProductEntity, entity, {
        strategy: 'excludeAll',
      }),
    );

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder(ProductModel, 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('variants.properties', 'properties')
      .leftJoinAndSelect('properties.property', 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .where('product.uuid = :uuid', { uuid })
      .orderBy('variants.createdAt', 'ASC')
      .addOrderBy('properties.order', 'ASC')
      .getOneOrFail();

    const resultInstance = plainToInstance(ProductEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(dto: CreateProductDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(ProductModel)
        .values({
          uuid: newUuid,
          name: dto.name,
          description: dto.description,
          brandUuid: dto.brandUuid,
          categoryUuid: dto.categoryUuid,
        })
        .execute();

      for (let index in dto.variants) {
        const variant = dto.variants[index];

        const newVariant = await runner.manager.insert(VariantModel, [
          {
            name: variant.name,
            description: variant.description,
            productUuid: newUuid,
          },
        ]);

        await runner.manager.insert(
          VariantPropertyModel,
          variant.properties.map((property, order) => {
            return {
              variantUuid: newVariant.raw[0].uuid,
              propertyUuid: property.propertyUuid,
              value: property.value,
              order,
            };
          }),
        );
      }

      const result = await runner.manager
        .createQueryBuilder(ProductModel, 'product')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.variants', 'variants')
        .leftJoinAndSelect('variants.properties', 'properties')
        .leftJoinAndSelect('properties.property', 'property')
        .leftJoinAndSelect('property.unit', 'unit')
        .where('product.uuid = :uuid', { uuid: newUuid })
        .orderBy('variants.createdAt', 'ASC')
        .addOrderBy('properties.order', 'ASC')
        .getOneOrFail();

      const resultInstance = plainToInstance(ProductEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);
      await runner.commitTransaction();

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async update(dto: UpdateProductDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.manager
        .createQueryBuilder()
        .update(ProductModel)
        .set({
          name: dto.name,
          description: dto.description,
          brandUuid: dto.brandUuid,
          categoryUuid: dto.categoryUuid,
        })
        .where('product.uuid = :uuid', { uuid: dto.uuid })
        .execute();

      const existingUuids = dto.variants.map((p) => p.uuid).filter(Boolean);

      await runner.manager
        .createQueryBuilder()
        .delete()
        .from(VariantModel)
        .where('productUuid = :productUuid', { productUuid: dto.uuid })
        .andWhere(existingUuids.length > 0 ? 'uuid NOT IN (:...existingUuids)' : '1=1', { existingUuids })
        .execute();

      for (let index in dto.variants) {
        const variant = dto.variants[index];

        if (variant.uuid) {
          await runner.manager.upsert(
            VariantModel,
            [
              {
                uuid: variant.uuid,
                name: variant.name,
                description: variant.description,
                productUuid: dto.uuid,
              },
            ],
            ['uuid'],
          );

          const existingUuids = variant.properties.map((p) => p.uuid).filter(Boolean);

          await runner.manager
            .createQueryBuilder()
            .delete()
            .from(VariantPropertyModel)
            .where('variantUuid = :variantUuid', { variantUuid: variant.uuid })
            .andWhere(existingUuids.length > 0 ? 'uuid NOT IN (:...existingUuids)' : '1=1', { existingUuids })
            .execute();

          await runner.manager.upsert(
            VariantPropertyModel,
            variant.properties.map((property, order) => {
              return {
                uuid: property?.uuid,
                variantUuid: variant.uuid,
                propertyUuid: property.propertyUuid,
                value: property.value,
                order,
              };
            }),
            ['uuid'],
          );
        } else {
          const newVariant = await runner.manager.insert(VariantModel, [
            {
              name: variant.name,
              description: variant.description,
              productUuid: dto.uuid,
            },
          ]);

          await runner.manager.insert(
            VariantPropertyModel,
            variant.properties.map((property, order) => {
              return {
                variantUuid: newVariant.raw[0].uuid,
                propertyUuid: property.propertyUuid,
                value: property.value,
                order,
              };
            }),
          );
        }
      }

      const result = await runner.manager
        .createQueryBuilder(ProductModel, 'product')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.variants', 'variants')
        .leftJoinAndSelect('variants.properties', 'properties')
        .leftJoinAndSelect('properties.property', 'property')
        .leftJoinAndSelect('property.unit', 'unit')
        .where('product.uuid = :uuid', { uuid: dto.uuid })
        .orderBy('variants.createdAt', 'ASC')
        .addOrderBy('properties.order', 'ASC')
        .getOneOrFail();

      const resultInstance = plainToInstance(ProductEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);

      new Promise((resolve, reject) => {
        this.productProxy.emit('product.updated', resultInstance).subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err),
        });
      });

      await runner.commitTransaction();

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}
