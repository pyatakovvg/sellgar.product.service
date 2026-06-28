import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { OutboxEventInput, OutboxWriter } from '@sellgar/outbox';

import * as uuid from 'uuid';
import { DataSource, EntityManager } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateProductDto, ProductVariantImage } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { ProductModel } from '../product.model';

import { CatalogStatus } from '../../catalog/catalog-status.enum';
import { ProductEntity } from '../product.entity';
import { VariantModel } from '../../variant/variant.model';
import { VariantPropertyModel } from '../../variant/variant-property.model';
import { ImageModel } from '../../image/image.model';
import { VariantImageModel } from '../../variant/variant-image.model';

type ProductUpdateRow = {
  uuid: string;
  version: number;
  name: string;
  status: CatalogStatus;
};

type VariantUpdateRow = {
  uuid: string;
  version: number;
  name: string;
  product_uuid: string;
  status: CatalogStatus;
};

@Injectable()
export class ProductRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly outboxWriter: OutboxWriter,
  ) {}

  count() {
    return this.dataSource
      .createQueryBuilder(ProductModel, 'product')
      .where('product.status != :archivedStatus', { archivedStatus: CatalogStatus.Archived })
      .getCount();
  }

  async findAll() {
    const result = await this.dataSource
      .createQueryBuilder(ProductModel, 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants', 'variants.status != :archivedVariantStatus', {
        archivedVariantStatus: CatalogStatus.Archived,
      })
      .leftJoinAndSelect('variants.properties', 'properties')
      .leftJoinAndSelect('properties.property', 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .leftJoinAndSelect('variants.images', 'images')
      .leftJoinAndSelect('images.image', 'image')
      .where('product.status != :archivedProductStatus', { archivedProductStatus: CatalogStatus.Archived })
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
      .leftJoinAndSelect('product.variants', 'variants', 'variants.status != :archivedVariantStatus', {
        archivedVariantStatus: CatalogStatus.Archived,
      })
      .leftJoinAndSelect('variants.properties', 'properties')
      .leftJoinAndSelect('properties.property', 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .leftJoinAndSelect('variants.images', 'images')
      .leftJoinAndSelect('images.image', 'image')
      .where('product.uuid = :uuid', { uuid })
      .andWhere('product.status != :archivedProductStatus', { archivedProductStatus: CatalogStatus.Archived })
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
          status: CatalogStatus.Active,
        })
        .execute();

      integrationEvents.push(
        this.createIntegrationEvent('product.created', 'product', newUuid, 1, {
          name: dto.name,
          status: CatalogStatus.Active,
        }),
      );

      for (let index in dto.variants) {
        const variant = dto.variants[index];

        const newVariant = await runner.manager.insert(VariantModel, [
          {
            name: variant.name,
            description: variant.description,
            productUuid: newUuid,
            status: CatalogStatus.Active,
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
            status: CatalogStatus.Active,
          }),
        );
      }

      const result = await runner.manager
        .createQueryBuilder(ProductModel, 'product')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.variants', 'variants', 'variants.status != :archivedVariantStatus', {
          archivedVariantStatus: CatalogStatus.Archived,
        })
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
      const product = await runner.manager
        .createQueryBuilder(ProductModel, 'product')
        .setLock('pessimistic_write')
        .where('product.uuid = :uuid', { uuid: dto.uuid })
        .andWhere('product.status != :archivedStatus', { archivedStatus: CatalogStatus.Archived })
        .getOne();

      if (!product) {
        throw new NotFoundException(`Product ${dto.uuid} not found`);
      }

      if (product.version !== dto.version) {
        throw new ConflictException(`Product ${dto.uuid} was changed by another request`);
      }

      const previousVariants = await runner.manager
        .createQueryBuilder(VariantModel, 'variant')
        .setLock('pessimistic_write')
        .where('variant.productUuid = :productUuid', { productUuid: dto.uuid })
        .getMany();
      const previousVariantMap = new Map(previousVariants.map((variant) => [variant.uuid, variant]));
      const incomingVariantUuids = dto.variants.map((variant) => variant.uuid).filter((value): value is string => Boolean(value));
      const duplicateVariantUuid = this.findDuplicate(incomingVariantUuids);

      if (duplicateVariantUuid) {
        throw new BadRequestException(`Variant ${duplicateVariantUuid} is duplicated in update payload`);
      }

      const invalidVariantUuids = incomingVariantUuids.filter((variantUuid) => {
        const previousVariant = previousVariantMap.get(variantUuid);

        return !previousVariant || previousVariant.status === CatalogStatus.Archived;
      });

      if (invalidVariantUuids.length > 0) {
        throw new BadRequestException(`Some variants do not belong to active product ${dto.uuid}`);
      }

      const productUpdateResult = await runner.manager
        .createQueryBuilder()
        .update(ProductModel)
        .set({
          name: dto.name,
          description: dto.description,
          brandUuid: dto.brandUuid,
          categoryUuid: dto.categoryUuid,
          version: () => 'version + 1',
        })
        .where('uuid = :uuid', { uuid: dto.uuid })
        .andWhere('status != :archivedStatus', { archivedStatus: CatalogStatus.Archived })
        .andWhere('version = :version', { version: dto.version })
        .returning(['uuid', 'version', 'name', 'status'])
        .execute();

      const removedVariants = previousVariants.filter(
        (variant) => variant.status !== CatalogStatus.Archived && !incomingVariantUuids.includes(variant.uuid),
      );
      const productRow = this.expectSingleRaw<ProductUpdateRow>(productUpdateResult.raw, `Product ${dto.uuid} not found`);

      if (removedVariants.length > 0) {
        const archiveResult = await runner.manager
          .createQueryBuilder()
          .update(VariantModel)
          .set({
            status: CatalogStatus.Archived,
            version: () => 'version + 1',
          })
          .where('uuid IN (:...removedVariantUuids)', {
            removedVariantUuids: removedVariants.map((variant) => variant.uuid),
          })
          .andWhere('product_uuid = :productUuid', { productUuid: dto.uuid })
          .andWhere('status != :archivedStatus', { archivedStatus: CatalogStatus.Archived })
          .returning(['uuid', 'version', 'name', 'product_uuid', 'status'])
          .execute();

        for (const variant of archiveResult.raw as VariantUpdateRow[]) {
          integrationEvents.push(
            this.createIntegrationEvent('variant.deleted', 'variant', variant.uuid, variant.version, {
              productUuid: variant.product_uuid,
              name: variant.name,
              status: variant.status,
            }),
          );
        }
      }

      for (let index in dto.variants) {
        const variant = dto.variants[index];

        if (variant.uuid) {
          const variantUpdateResult = await runner.manager
            .createQueryBuilder()
            .update(VariantModel)
            .set({
              name: variant.name,
              description: variant.description,
              version: () => 'version + 1',
            })
            .where('uuid = :uuid', { uuid: variant.uuid })
            .andWhere('product_uuid = :productUuid', { productUuid: dto.uuid })
            .andWhere('status != :archivedStatus', { archivedStatus: CatalogStatus.Archived })
            .returning(['uuid', 'version', 'name', 'product_uuid', 'status'])
            .execute();

          const variantRow = this.expectSingleRaw<VariantUpdateRow>(
            variantUpdateResult.raw,
            `Variant ${variant.uuid} not found in product ${dto.uuid}`,
          );

          integrationEvents.push(
            this.createIntegrationEvent('variant.updated', 'variant', variantRow.uuid, variantRow.version, {
              productUuid: variantRow.product_uuid,
              name: variantRow.name,
              status: variantRow.status,
            }),
          );

          await this.syncVariantProperties(runner.manager, variant.uuid, variant.properties);

          if (variant.images) {
            await this.syncVariantImages(runner.manager, variant.uuid, variant.images);
          }
        } else {
          const newVariant = await runner.manager.insert(VariantModel, [
            {
              name: variant.name,
              description: variant.description,
              productUuid: dto.uuid,
              status: CatalogStatus.Active,
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
              status: CatalogStatus.Active,
            }),
          );
        }
      }

      const result = await runner.manager
        .createQueryBuilder(ProductModel, 'product')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.variants', 'variants', 'variants.status != :archivedVariantStatus', {
          archivedVariantStatus: CatalogStatus.Archived,
        })
        .leftJoinAndSelect('variants.properties', 'properties')
        .leftJoinAndSelect('properties.property', 'property')
        .leftJoinAndSelect('property.unit', 'unit')
        .leftJoinAndSelect('variants.images', 'images')
        .leftJoinAndSelect('images.image', 'image')
        .where('product.uuid = :uuid', { uuid: dto.uuid })
        .andWhere('product.status != :archivedProductStatus', { archivedProductStatus: CatalogStatus.Archived })
        .orderBy('variants.createdAt', 'ASC')
        .addOrderBy('properties.order', 'ASC')
        .addOrderBy('images.sortOrder', 'ASC')
        .getOneOrFail();

      const resultInstance = plainToInstance(ProductEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);

      integrationEvents.unshift(
        this.createIntegrationEvent('product.updated', 'product', productRow.uuid, productRow.version, {
          name: productRow.name,
          status: productRow.status,
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

  private async syncVariantProperties(
    manager: EntityManager,
    variantUuid: string,
    properties: UpdateProductDto['variants'][number]['properties'],
  ) {
    const existingUuids = properties.map((property) => property.uuid).filter((value): value is string => Boolean(value));
    const duplicatePropertyUuid = this.findDuplicate(existingUuids);

    if (duplicatePropertyUuid) {
      throw new BadRequestException(`Variant property ${duplicatePropertyUuid} is duplicated in update payload`);
    }

    if (existingUuids.length > 0) {
      const existingProperties = await manager
        .createQueryBuilder(VariantPropertyModel, 'variantProperty')
        .where('variantProperty.uuid IN (:...existingUuids)', { existingUuids })
        .getMany();
      const existingPropertyMap = new Map(existingProperties.map((property) => [property.uuid, property]));
      const invalidPropertyUuid = existingUuids.find((propertyUuid) => existingPropertyMap.get(propertyUuid)?.variantUuid !== variantUuid);

      if (invalidPropertyUuid) {
        throw new BadRequestException(`Variant property ${invalidPropertyUuid} does not belong to variant ${variantUuid}`);
      }
    }

    await manager
      .createQueryBuilder()
      .delete()
      .from(VariantPropertyModel)
      .where('variant_uuid = :variantUuid', { variantUuid })
      .andWhere(existingUuids.length > 0 ? 'uuid NOT IN (:...existingUuids)' : '1=1', { existingUuids })
      .execute();

    await manager.upsert(
      VariantPropertyModel,
      properties.map((property, order) => {
        return {
          uuid: property?.uuid,
          variantUuid,
          propertyUuid: property.propertyUuid,
          value: property.value,
          order,
        };
      }),
      ['uuid'],
    );
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

  private expectSingleRaw<T>(rows: T[], message: string) {
    const row = rows[0];

    if (!row) {
      throw new NotFoundException(message);
    }

    return row;
  }

  private findDuplicate(values: string[]) {
    const seen = new Set<string>();

    for (const value of values) {
      if (seen.has(value)) {
        return value;
      }

      seen.add(value);
    }

    return null;
  }
}
