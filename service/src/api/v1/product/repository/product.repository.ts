import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { OutboxEventInput, OutboxWriter } from '@sellgar/outbox';

import * as uuid from 'uuid';
import { DataSource, EntityManager } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateProductDto, ProductVariantImage } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { ProductModel } from '../product.model';

import { ProductEntity } from '../product.entity';
import { VariantModel } from '../../variant/variant.model';
import { VariantPropertyModel } from '../../variant/variant-property.model';
import { ImageModel } from '../../image/image.model';
import { VariantImageModel } from '../../variant/variant-image.model';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly outboxWriter: OutboxWriter,
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
      .leftJoinAndSelect('variants.images', 'images')
      .leftJoinAndSelect('images.image', 'image')
      .orderBy('product.createdAt', 'DESC')
      .addOrderBy('variants.createdAt', 'ASC')
      .addOrderBy('properties.order', 'ASC')
      .addOrderBy('images.sortOrder', 'ASC')
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
      .leftJoinAndSelect('variants.images', 'images')
      .leftJoinAndSelect('images.image', 'image')
      .where('product.uuid = :uuid', { uuid })
      .orderBy('variants.createdAt', 'ASC')
      .addOrderBy('properties.order', 'ASC')
      .addOrderBy('images.sortOrder', 'ASC')
      .getOneOrFail();

    const resultInstance = plainToInstance(ProductEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(dto: CreateProductDto) {
    const runner = this.dataSource.createQueryRunner();
    const integrationEvents: OutboxEventInput[] = [];

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

      integrationEvents.push(
        this.createIntegrationEvent('product.created', 'product', newUuid, 1, {
          name: dto.name,
          status: 'active',
        }),
      );

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

        await this.syncVariantImages(runner.manager, newVariant.raw[0].uuid, variant.images);

        integrationEvents.push(
          this.createIntegrationEvent('variant.created', 'variant', newVariant.raw[0].uuid, 1, {
            productUuid: newUuid,
            name: variant.name,
            status: 'active',
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
        .leftJoinAndSelect('variants.images', 'images')
        .leftJoinAndSelect('images.image', 'image')
        .where('product.uuid = :uuid', { uuid: newUuid })
        .orderBy('variants.createdAt', 'ASC')
        .addOrderBy('properties.order', 'ASC')
        .addOrderBy('images.sortOrder', 'ASC')
        .getOneOrFail();

      const resultInstance = plainToInstance(ProductEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);
      await this.insertOutboxEvents(runner.manager, integrationEvents);
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
    const integrationEvents: OutboxEventInput[] = [];

    await runner.connect();
    await runner.startTransaction();

    try {
      const previousVariants = await runner.manager.find(VariantModel, { where: { productUuid: dto.uuid } });
      const previousVariantMap = new Map(previousVariants.map((variant) => [variant.uuid, variant]));

      await runner.manager
        .createQueryBuilder()
        .update(ProductModel)
        .set({
          name: dto.name,
          description: dto.description,
          brandUuid: dto.brandUuid,
          categoryUuid: dto.categoryUuid,
          version: () => 'version + 1',
        })
        .where('product.uuid = :uuid', { uuid: dto.uuid })
        .execute();

      const existingUuids = dto.variants.map((p) => p.uuid).filter(Boolean);
      const removedVariants = previousVariants.filter((variant) => !existingUuids.includes(variant.uuid));

      await runner.manager
        .createQueryBuilder()
        .delete()
        .from(VariantModel)
        .where('productUuid = :productUuid', { productUuid: dto.uuid })
        .andWhere(existingUuids.length > 0 ? 'uuid NOT IN (:...existingUuids)' : '1=1', { existingUuids })
        .execute();

      for (const variant of removedVariants) {
        integrationEvents.push(
          this.createIntegrationEvent('variant.deleted', 'variant', variant.uuid, variant.version + 1, {
            productUuid: variant.productUuid,
            name: variant.name,
            status: 'archived',
          }),
        );
      }

      for (let index in dto.variants) {
        const variant = dto.variants[index];

        if (variant.uuid) {
          await runner.manager
            .createQueryBuilder()
            .update(VariantModel)
            .set({
              name: variant.name,
              description: variant.description,
              productUuid: dto.uuid,
              version: () => 'version + 1',
            })
            .where('uuid = :uuid', { uuid: variant.uuid })
            .execute();

          const previousVariant = previousVariantMap.get(variant.uuid);
          const nextVersion = (previousVariant?.version ?? 0) + 1;

          integrationEvents.push(
            this.createIntegrationEvent('variant.updated', 'variant', variant.uuid, nextVersion, {
              productUuid: dto.uuid,
              name: variant.name,
              status: 'active',
            }),
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

          if (variant.images) {
            await this.syncVariantImages(runner.manager, variant.uuid, variant.images);
          }
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

          await this.syncVariantImages(runner.manager, newVariant.raw[0].uuid, variant.images);

          integrationEvents.push(
            this.createIntegrationEvent('variant.created', 'variant', newVariant.raw[0].uuid, 1, {
              productUuid: dto.uuid,
              name: variant.name,
              status: 'active',
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
        .leftJoinAndSelect('variants.images', 'images')
        .leftJoinAndSelect('images.image', 'image')
        .where('product.uuid = :uuid', { uuid: dto.uuid })
        .orderBy('variants.createdAt', 'ASC')
        .addOrderBy('properties.order', 'ASC')
        .addOrderBy('images.sortOrder', 'ASC')
        .getOneOrFail();

      const resultInstance = plainToInstance(ProductEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);

      integrationEvents.unshift(
        this.createIntegrationEvent('product.updated', 'product', result.uuid, result.version, {
          name: result.name,
          status: 'active',
        }),
      );
      await this.insertOutboxEvents(runner.manager, integrationEvents);
      await runner.commitTransaction();

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async syncVariantImages(manager: EntityManager, variantUuid: string, images: ProductVariantImage[] = []) {
    const imageMap = new Map<string, ProductVariantImage>();

    for (const image of images) {
      if (image.imageUuid) {
        imageMap.set(image.imageUuid, image);
      }
    }

    const normalizedImages = Array.from(imageMap.values());

    await manager.createQueryBuilder().delete().from(VariantImageModel).where('variant_uuid = :variantUuid', { variantUuid }).execute();

    for (const [index, image] of normalizedImages.entries()) {
      if (!image.imageUuid) {
        continue;
      }

      const imageExists = await manager
        .createQueryBuilder(ImageModel, 'image')
        .where('image.uuid = :uuid', { uuid: image.imageUuid })
        .getExists();

      if (!imageExists) {
        if (!image.fileName) {
          throw new NotFoundException(`Image ${image.imageUuid} not found`);
        }

        await manager
          .createQueryBuilder()
          .insert()
          .into(ImageModel)
          .values({
            uuid: image.imageUuid,
            fileName: image.fileName,
          })
          .execute();
      }

      await manager
        .createQueryBuilder()
        .insert()
        .into(VariantImageModel)
        .values({
          variantUuid,
          imageUuid: image.imageUuid,
          sortOrder: index,
          isPrimary: index === 0,
          alt: image.alt ?? null,
        })
        .execute();
    }
  }

  private createIntegrationEvent(
    eventType: string,
    aggregateType: 'product' | 'variant',
    aggregateUuid: string,
    aggregateVersion: number,
    payload: Record<string, unknown>,
  ): OutboxEventInput {
    return {
      eventType,
      schemaVersion: 1,
      aggregateType,
      aggregateUuid,
      aggregateVersion,
      occurredAt: new Date(),
      payload,
    };
  }

  private insertOutboxEvents(manager: EntityManager, events: OutboxEventInput[]) {
    return this.outboxWriter.addMany(manager, events);
  }
}
