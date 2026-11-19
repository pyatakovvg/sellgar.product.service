import { Injectable } from '@nestjs/common';
import { OutboxWriter } from '@sellgar/outbox';
import { instanceToPlain } from 'class-transformer';
import { EntityManager, In } from 'typeorm';

import { ProductEntity } from '../../catalog/product/entity/product.entity';
import { ProductModel } from '../../catalog/product/product.model';
import { ProductSnapshotService } from './product-snapshot.service';

type ProductEventType = 'product.created' | 'product.updated';

@Injectable()
export class ProductOutboxService {
  constructor(
    private readonly writer: OutboxWriter,
    private readonly snapshots: ProductSnapshotService,
  ) {}

  async created(manager: EntityManager, uuid: string): Promise<ProductModel> {
    const product = await this.snapshots.get(manager, uuid);
    await this.write(manager, 'product.created', product);
    return product;
  }

  async updated(manager: EntityManager, uuid: string): Promise<ProductModel> {
    const product = await this.snapshots.get(manager, uuid);
    await this.write(manager, 'product.updated', product);
    return product;
  }

  async touchByType(manager: EntityManager, typeUuid: string): Promise<ProductModel[]> {
    const rows = await manager.query(
      'SELECT uuid FROM product WHERE type_uuid = $1 ORDER BY uuid FOR UPDATE',
      [typeUuid],
    ) as Array<{ uuid: string }>;
    return this.touch(manager, rows.map((row) => row.uuid));
  }

  async touchByProperty(manager: EntityManager, propertyCode: string): Promise<ProductModel[]> {
    const rows = await manager.query(
      `SELECT product.uuid
       FROM product
       WHERE product.type_uuid IN (
         SELECT type_uuid FROM type_product_field WHERE property_code = $1
         UNION
         SELECT type_uuid FROM type_variant_field WHERE property_code = $1
       )
       ORDER BY product.uuid
       FOR UPDATE`,
      [propertyCode],
    ) as Array<{ uuid: string }>;
    return this.touch(manager, rows.map((row) => row.uuid));
  }

  async touchByImage(manager: EntityManager, imageUuid: string): Promise<ProductModel[]> {
    const rows = await manager.query(
      `SELECT product.uuid
       FROM product
       WHERE product.uuid IN (
         SELECT variant.product_uuid
         FROM variant
         INNER JOIN variant_image ON variant_image.variant_uuid = variant.uuid
         WHERE variant_image.image_uuid = $1
       )
       ORDER BY product.uuid
       FOR UPDATE`,
      [imageUuid],
    ) as Array<{ uuid: string }>;
    return this.touch(manager, rows.map((row) => row.uuid));
  }

  private async touch(manager: EntityManager, uuids: string[]): Promise<ProductModel[]> {
    if (uuids.length === 0) return [];
    await manager.update(ProductModel, { uuid: In(uuids) }, { version: () => 'version + 1' });
    const products = await this.snapshots.getMany(manager, uuids);
    await this.writer.addMany(manager, products.map((product) => this.event('product.updated', product)));
    return products;
  }

  private write(manager: EntityManager, eventType: ProductEventType, product: ProductModel): Promise<unknown> {
    return this.writer.add(manager, this.event(eventType, product));
  }

  private event(eventType: ProductEventType, product: ProductModel) {
    return {
      eventType,
      aggregateType: 'product',
      aggregateId: product.uuid,
      aggregateVersion: product.version,
      schemaVersion: 3,
      payload: instanceToPlain(ProductEntity.fromModel(product)) as Record<string, unknown>,
    };
  }
}
