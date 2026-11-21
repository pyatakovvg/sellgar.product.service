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
import { ProductController } from '../../catalog/product/controller/product.controller';
import { ProductCommandMapper } from '../../catalog/product/controller/mapper/product-command.mapper';
import { ProductService } from '../../catalog/product/service/product.service';
import { ProductTypeRepository } from '../../catalog/product-type/repository/product-type.repository';
import { PropertyAssignmentService } from '../../catalog/product/service/property-assignment.service';
import { ProductFilterService } from '../../catalog/product/service/product-filter.service';
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

  it('selects only filled properties per owner while default reads and events retain template fields', async () => {
    const runner = database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction('REPEATABLE READ');
    try {
      const manager = runner.manager;
      const fields = [
        { code: 'empty', kind: PropertyKind.TEXT },
        { code: 'assignment-without-values', kind: PropertyKind.TEXT },
        { code: 'zero', kind: PropertyKind.INTEGER },
        { code: 'false', kind: PropertyKind.BOOLEAN },
        { code: 'decimal-zero', kind: PropertyKind.DECIMAL },
      ];
      for (const [index, field] of fields.entries()) {
        await manager.insert(PropertyModel, { ...field, name: field.code });
        const definition = {
          typeUuid,
          propertyCode: field.code,
          propertyKind: field.kind,
          sortOrder: index + 10,
        };
        await manager.insert(TypeProductFieldModel, definition);
        await manager.insert(TypeVariantFieldModel, definition);
        if (field.code === 'empty') continue;

        const assignment = { typeUuid, propertyCode: field.code, propertyKind: field.kind };
        await manager.insert(ProductPropertyModel, { ...assignment, productUuid });
        await manager.insert(VariantPropertyModel, { ...assignment, variantUuid: variantUuids[0] });
        if (field.code === 'assignment-without-values') continue;

        const value = {
          ...assignment,
          position: 0,
          ...(field.kind === PropertyKind.INTEGER ? { valueInteger: '0' } : {}),
          ...(field.kind === PropertyKind.BOOLEAN ? { valueBoolean: false } : {}),
          ...(field.kind === PropertyKind.DECIMAL ? { valueDecimal: '0.000000000000' } : {}),
        };
        await manager.insert(ProductPropertyValueModel, { ...value, productUuid });
        await manager.insert(VariantPropertyValueModel, { ...value, variantUuid: variantUuids[0] });
      }
      const repository = new ProductRepository(
        { manager, transaction: (_isolation, callback) => callback(manager) } as DataSource,
        {} as ProductOutboxService,
        snapshots,
      );
      const service = new ProductService(
        repository,
        {} as ProductTypeRepository,
        {} as PropertyAssignmentService,
        {} as ProductFilterService,
      );
      const controller = new ProductController(service, {} as ProductCommandMapper);
      queries.length = 0;
      const selected = await controller.getByUuid({ uuid: productUuid, withEmptyProperties: false });
      const codes = (entity: { properties: { propertyCode: string }[] }) =>
        entity.properties.map((field) => field.propertyCode);
      expect(codes(selected)).toEqual(['product-0', 'product-1', 'product-2', 'zero', 'false', 'decimal-zero']);
      expect(codes(selected.variants[0])).toEqual(['variant-option', 'zero', 'false', 'decimal-zero']);
      expect(selected.variants.slice(1).every((variant) => codes(variant).join() === 'variant-option')).toBe(true);
      expect(selected.properties.find((field) => field.propertyCode === 'zero')!.values[0].valueInteger).toBe('0');
      expect(selected.properties.find((field) => field.propertyCode === 'false')!.values[0].valueBoolean).toBe(false);
      expect(selected.properties.find((field) => field.propertyCode === 'decimal-zero')!.values[0].valueDecimal).toBe(
        '0.000000000000',
      );
      expect(selected.variants[0].properties[0].property.options).toHaveLength(5);
      expect(selected.variants[0].images).toHaveLength(2);
      expect(queries.some((query) => query.includes('EXISTS') && query.includes('product_property_value'))).toBe(true);
      expect(queries.some((query) => query.includes('EXISTS') && query.includes('variant_property_value'))).toBe(true);
      expect(queries.length).toBeLessThan(40);

      const full = await controller.getByUuid({ uuid: productUuid });
      expect(await controller.getByUuid({ uuid: productUuid, withEmptyProperties: true })).toEqual(full);
      expect(codes(full)).toContain('empty');
      expect(codes(full)).toContain('assignment-without-values');
      expect(full.variants.every((variant) => codes(variant).includes('empty'))).toBe(true);
      const add = jest.fn().mockResolvedValue(undefined);
      const outbox = new ProductOutboxService({ add } as unknown as OutboxWriter, snapshots);
      await outbox.updated(manager, productUuid);
      expect(codes(add.mock.calls[0][1].payload)).toContain('empty');
      expect(codes(add.mock.calls[0][1].payload.variants[0])).toContain('empty');

      const withoutValues = ProductEntity.fromModel(await repository.getByUuid(otherProductUuid, false), false);
      expect(withoutValues.properties).toEqual([]);
      expect(withoutValues.variants).toEqual([]);
      await expect(repository.getByUuid(randomUUID(), false)).rejects.toThrow('not found');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('reads only the selected variant and rejects a variant belonging to another product', async () => {
    const repository = new ProductRepository(database, {} as ProductOutboxService, snapshots);
    const result = await repository.getVariants(productUuid, variantUuids[0]);
    expect(result.variants.map((variant) => variant.uuid)).toEqual([variantUuids[0]]);
    expect(result.product.productType.variantFields).toHaveLength(1);
    await expect(repository.getVariants(otherProductUuid, variantUuids[0])).rejects.toThrow('not found');
  });
});
