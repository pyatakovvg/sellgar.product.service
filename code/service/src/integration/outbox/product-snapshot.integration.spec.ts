import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { OutboxWriter } from '@sellgar/outbox';

import { databaseOptions } from '../../database/database.options';
import { ProductModel } from '../../catalog/product/product.model';
import { ProductStatus } from '../../catalog/product/product-status.enum';
import { VariantModel } from '../../catalog/product/variant.model';
import { BrandModel } from '../../catalog/brand/brand.model';
import { ProductTypeModel } from '../../catalog/product-type/product-type.model';
import { TypeProductFieldModel } from '../../catalog/product-type/type-product-field.model';
import { TypeVariantFieldModel } from '../../catalog/product-type/type-variant-field.model';
import { PropertyModel } from '../../catalog/property/property.model';
import { PropertyKind } from '../../catalog/property/property-kind.enum';
import { PropertyOptionModel } from '../../catalog/property/property-option.model';
import { ProductPropertyModel } from '../../catalog/product/product-property.model';
import { ProductPropertyValueModel } from '../../catalog/product/product-property-value.model';
import { VariantPropertyModel } from '../../catalog/product/variant-property.model';
import { VariantPropertyValueModel } from '../../catalog/product/variant-property-value.model';
import { VariantImageModel } from '../../catalog/product/variant-image.model';
import { ImageModel } from '../../catalog/image/infrastructure/persistence/model/image.model';
import { ProductEntity } from '../../catalog/product/entity/product.entity';
import { ProductRepository } from '../../catalog/product/repository/product.repository';
import { ProductOutboxService } from './product-outbox.service';
import { ProductSnapshotService } from './product-snapshot.service';

const describeDatabase = process.env.PRODUCT_SNAPSHOT_DATABASE_TESTS === '1' ? describe : describe.skip;

describeDatabase('Product snapshots with multiple collections on PostgreSQL', () => {
  const schema = `product_snapshot_test_${randomUUID().replaceAll('-', '')}`;
  const productUuid = randomUUID();
  const otherProductUuid = randomUUID();
  const typeUuid = randomUUID();
  const variantUuids = Array.from({ length: 15 }, () => randomUUID()).sort();
  const snapshots = new ProductSnapshotService();
  const queries: string[] = [];
  let database: DataSource;

  beforeAll(async () => {
    const options = databaseOptions(process.env);
    if (options.type !== 'postgres') throw new Error('PostgreSQL is required');
    database = new DataSource({
      ...options,
      schema,
      logger: {
        logQuery(query) {
          queries.push(query);
        },
        logQueryError() {},
        logQuerySlow() {},
        logSchemaBuild() {},
        logMigration() {},
        log() {},
      },
      logging: ['query'],
    });
    await database.initialize();
    await database.query(`CREATE SCHEMA "${schema}"`);
    await database.synchronize();
    const manager = database.manager;
    await database.query(`ALTER TABLE "${schema}".product ALTER COLUMN search_vector SET DEFAULT to_tsvector('')`);
    await manager.insert(BrandModel, { code: 'test-brand', name: 'Test brand' });
    await manager.insert(ProductTypeModel, { uuid: typeUuid, name: 'Test type' });
    await manager.insert(
      ProductModel,
      [productUuid, otherProductUuid].map((uuid) => ({
        uuid,
        typeUuid,
        name: 'Test product',
        brandCode: 'test-brand',
        status: ProductStatus.ACTIVE,
      })),
    );
    for (let index = 2; index >= 0; index--) {
      const propertyCode = `product-${index}`;
      await manager.insert(PropertyModel, { code: propertyCode, name: propertyCode, kind: PropertyKind.TEXT });
      await manager.insert(TypeProductFieldModel, {
        typeUuid,
        propertyCode,
        propertyKind: PropertyKind.TEXT,
        multiple: true,
        sortOrder: index,
      });
      await manager.insert(ProductPropertyModel, {
        productUuid,
        typeUuid,
        propertyCode,
        propertyKind: PropertyKind.TEXT,
      });
      await manager.insert(
        ProductPropertyValueModel,
        [1, 0].map((position) => ({
          productUuid,
          typeUuid,
          propertyCode,
          propertyKind: PropertyKind.TEXT,
          position,
          valueText: `value-${position}`,
        })),
      );
    }
    const propertyCode = 'variant-option';
    await manager.insert(PropertyModel, { code: propertyCode, name: propertyCode, kind: PropertyKind.OPTIONS });
    await manager.insert(TypeVariantFieldModel, {
      typeUuid,
      propertyCode,
      propertyKind: PropertyKind.OPTIONS,
      multiple: true,
    });
    await manager.insert(
      PropertyOptionModel,
      [0, 1, 2, 3, 4].map((index) => ({
        propertyCode,
        code: `option-${index}`,
        name: `Option ${index}`,
        sortOrder: index,
      })),
    );
    for (const uuid of [...variantUuids].reverse()) {
      await manager.insert(VariantModel, { uuid, productUuid, typeUuid, name: uuid });
      await manager.insert(VariantPropertyModel, {
        variantUuid: uuid,
        typeUuid,
        propertyCode,
        propertyKind: PropertyKind.OPTIONS,
      });
      await manager.insert(
        VariantPropertyValueModel,
        [1, 0].map((position) => ({
          variantUuid: uuid,
          typeUuid,
          propertyCode,
          propertyKind: PropertyKind.OPTIONS,
          position,
          valueOptionCode: `option-${position}`,
        })),
      );
      for (const sortOrder of [1, 0]) {
        const imageUuid = randomUUID();
        await manager.insert(ImageModel, { uuid: imageUuid, fileName: `${imageUuid}.jpg` });
        await manager.insert(VariantImageModel, { variantUuid: uuid, imageUuid, sortOrder });
      }
    }
  }, 30000);

  afterAll(async () => {
    if (database?.isInitialized) {
      await database.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await database.destroy();
    }
  });

  it('loads all variants, values, options and images without a cartesian root query', async () => {
    queries.length = 0;
    const product = await snapshots.get(database.manager, productUuid);
    const entity = ProductEntity.fromModel(product);
    expect(entity.variants.map((variant) => variant.uuid)).toEqual(variantUuids);
    expect(entity.properties.map((field) => field.propertyCode)).toEqual(['product-0', 'product-1', 'product-2']);
    expect(product.properties.every((field) => field.values.map((value) => value.position).join() === '0,1')).toBe(
      true,
    );
    for (const variant of entity.variants) {
      expect(variant.properties[0].values).toHaveLength(2);
      expect(variant.properties[0].property.options).toHaveLength(5);
      expect(variant.images.map((image) => image.sortOrder)).toEqual([0, 1]);
    }
    const selectQueries = queries.filter((query) => query.startsWith('SELECT'));
    expect(selectQueries.length).toBeLessThan(35);
    expect(selectQueries.find((query) => query.includes(`FROM "${schema}"."product"`))).not.toContain('JOIN');
  });

  it('writes all 15 variants to the unchanged integration event in the caller transaction', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const outbox = new ProductOutboxService({ add } as unknown as OutboxWriter, snapshots);
    await database.transaction(async (manager) => {
      await outbox.updated(manager, productUuid);
      expect(add).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          aggregateId: productUuid,
          aggregateVersion: 1,
          schemaVersion: 3,
          eventType: 'product.updated',
          payload: expect.objectContaining({
            variants: expect.arrayContaining(variantUuids.map((uuid) => expect.objectContaining({ uuid }))),
          }),
        }),
      );
      expect(add.mock.calls[0][1].payload.variants).toHaveLength(15);
    });
  });

  it('keeps query count and retained heap bounded over repeated reads', async () => {
    const samples: number[] = [];
    for (let index = 0; index < 40; index++) {
      queries.length = 0;
      const product = await snapshots.get(database.manager, productUuid);
      expect(product.variants).toHaveLength(15);
      expect(queries.length).toBeLessThan(40);
      if (global.gc) {
        global.gc();
        samples.push(process.memoryUsage().heapUsed);
      }
    }
    if (samples.length) {
      const warm = samples.slice(5);
      expect(Math.max(...warm) - Math.min(...warm)).toBeLessThan(16 * 1024 * 1024);
    }
  }, 30000);

  it('preserves requested product order and supports products without variants', async () => {
    const products = await snapshots.getMany(database.manager, [otherProductUuid, productUuid]);
    expect(products.map((product) => product.uuid)).toEqual([otherProductUuid, productUuid]);
    expect(ProductEntity.fromModel(products[0]).variants).toEqual([]);
    await expect(snapshots.get(database.manager, randomUUID())).rejects.toThrow('not found');
  });

  it('reads only the selected variant and rejects a variant belonging to another product', async () => {
    const repository = new ProductRepository(database, {} as ProductOutboxService, snapshots);
    const result = await repository.getVariants(productUuid, variantUuids[0]);
    expect(result.variants.map((variant) => variant.uuid)).toEqual([variantUuids[0]]);
    expect(result.product.productType.variantFields).toHaveLength(1);
    await expect(repository.getVariants(otherProductUuid, variantUuids[0])).rejects.toThrow('not found');
  });
});
