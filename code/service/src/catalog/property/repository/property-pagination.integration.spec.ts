import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';

import { ProductOutboxService } from '../../../integration/outbox/product-outbox.service';
import { ImageModel } from '../../image/infrastructure/persistence/model/image.model';
import { UnitModel } from '../../unit/unit.model';
import { PropertyModel } from '../property.model';
import { PropertyOptionModel } from '../property-option.model';
import { PropertyOptionExtraModel } from '../property-option-extra.model';
import { PropertyRepository } from './property.repository';

const describeDatabase = process.env.PRODUCT_PROPERTY_DATABASE_TESTS === '1' ? describe : describe.skip;

describeDatabase('Property pagination on PostgreSQL', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let repository: PropertyRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.PRODUCT_DATABASE_HOST,
      port: Number(process.env.PRODUCT_DATABASE_PORT ?? 5432),
      username: process.env.PRODUCT_DATABASE_USERNAME,
      password: process.env.PRODUCT_DATABASE_PASSWORD,
      database: process.env.PRODUCT_DATABASE_NAME,
      entities: [PropertyModel, PropertyOptionModel, PropertyOptionExtraModel, UnitModel, ImageModel],
      synchronize: false,
    });
    await dataSource.initialize();
    runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    const schema = `property_page_test_${randomUUID().replaceAll('-', '')}`;
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    await runner.query(`CREATE TABLE property (
      code varchar(256) PRIMARY KEY, name varchar(256), description text, kind text,
      unit_code varchar(256), version integer DEFAULT 1,
      created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
    )`);
    await runner.query(`CREATE TABLE property_option (
      property_code varchar(256), code varchar(256), name varchar(256), sort_order integer,
      PRIMARY KEY (property_code, code)
    )`);
    await runner.query(`CREATE TABLE property_option_extra (
      property_code varchar(256), option_code varchar(256), type text, sort_order integer,
      text_display text, value_text text, value_color varchar(9), image_uuid uuid,
      PRIMARY KEY (property_code, option_code, type, sort_order)
    )`);
    await runner.query(`INSERT INTO property(code, name, kind)
      SELECT 'property-' || lpad(n::text, 2, '0'), 'Свойство ' || n, 'TEXT'
      FROM generate_series(0, 58) AS n`);
    await runner.query("UPDATE property SET kind = 'OPTIONS' WHERE code = 'property-01'");
    await runner.query(`INSERT INTO property_option(property_code, code, name, sort_order)
      SELECT 'property-01', 'option-' || n, 'Опция ' || n, n FROM generate_series(0, 5) AS n`);
    repository = new PropertyRepository(
      { getRepository: (entity) => runner.manager.getRepository(entity) } as DataSource,
      {} as ProductOutboxService,
    );
  });

  afterAll(async () => {
    if (runner) {
      await runner.rollbackTransaction();
      await runner.release();
    }
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('counts properties rather than joined options when applying limit and offset', async () => {
    const first = await repository.getAll(50, 0);
    const second = await repository.getAll(50, 50);

    expect(first.total).toBe(59);
    expect(first.items).toHaveLength(50);
    expect(first.items[1].options.map((option) => option.code)).toEqual(
      Array.from({ length: 6 }, (_, index) => `option-${index}`),
    );
    expect(second.items).toHaveLength(9);
    expect([...first.items, ...second.items].map((property) => property.code)).toEqual(
      Array.from({ length: 59 }, (_, index) => `property-${index.toString().padStart(2, '0')}`),
    );
  });
});
