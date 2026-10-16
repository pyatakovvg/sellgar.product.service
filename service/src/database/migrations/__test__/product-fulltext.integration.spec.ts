import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';

import { AddProductFullTextSearch1792022400000 } from '../AddProductFullTextSearch1792022400000';

const describeDatabase = process.env.PRODUCT_SEARCH_DATABASE_TESTS === '1' ? describe : describe.skip;
const PRODUCT_UUID = '00000000-0000-4000-8000-000000000001';
const SECOND_PRODUCT_UUID = '00000000-0000-4000-8000-000000000002';
const VARIANT_UUID = '00000000-0000-4000-8000-000000000003';

describeDatabase('Product full-text search on PostgreSQL', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  const migration = new AddProductFullTextSearch1792022400000();

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.PRODUCT_DATABASE_HOST,
      port: Number(process.env.PRODUCT_DATABASE_PORT ?? 5432),
      username: process.env.PRODUCT_DATABASE_USERNAME,
      password: process.env.PRODUCT_DATABASE_PASSWORD,
      database: process.env.PRODUCT_DATABASE_NAME,
      synchronize: false,
    });
    await dataSource.initialize();
    runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    const schema = `product_search_test_${randomUUID().replaceAll('-', '')}`;
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}"`);
    await runner.query('CREATE TABLE brand (code text PRIMARY KEY, name text NOT NULL)');
    await runner.query(`CREATE TABLE product (
      uuid uuid PRIMARY KEY, name text NOT NULL, description text,
      brand_code text NOT NULL REFERENCES brand(code)
    )`);
    await runner.query(`CREATE TABLE variant (
      uuid uuid PRIMARY KEY, product_uuid uuid NOT NULL REFERENCES product(uuid),
      name text NOT NULL, description text, status text NOT NULL
    )`);
    await migration.up(runner);
  });

  afterAll(async () => {
    if (runner) {
      await runner.rollbackTransaction();
      await runner.release();
    }
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await runner.query('TRUNCATE variant, product, brand');
    await runner.query("INSERT INTO brand VALUES ('north', 'Фабрика Север'), ('shirt', 'Майка')");
    await runner.query(
      `INSERT INTO product VALUES
      ($1, 'Майка', 'Невидимая аннотация', 'north', DEFAULT),
      ($2, 'Телевизор', NULL, 'shirt', DEFAULT)
    `,
      [PRODUCT_UUID, SECOND_PRODUCT_UUID],
    );
    await runner.query(
      `INSERT INTO variant VALUES
      ($1, $2, 'Синяя', 'Несуществующее описание', 'active')
    `,
      [VARIANT_UUID, PRODUCT_UUID],
    );
  });

  const search = async (term: string): Promise<string[]> => {
    const rows = await runner.query(
      `
      SELECT uuid FROM product
      WHERE search_vector @@ product_search_query($1)
      ORDER BY ts_rank_cd(search_vector, product_search_query($1), 32) DESC, uuid
    `,
      [term],
    );
    return rows.map((row: { uuid: string }) => row.uuid);
  };

  it('находит название по префиксу и русской словоформе', async () => {
    expect(await search('май')).toEqual([PRODUCT_UUID, SECOND_PRODUCT_UUID]);
    expect(await search('майками')).toEqual([PRODUCT_UUID, SECOND_PRODUCT_UUID]);
  });

  it('совмещает слова из названия бренда и варианта', async () => {
    expect(await search('Север син')).toEqual([PRODUCT_UUID]);
    expect(await search('Север телевизор')).toEqual([]);
  });

  it('не ищет по описаниям и безопасно обрабатывает пунктуацию', async () => {
    expect(await search('аннотация')).toEqual([]);
    expect(await search('описание')).toEqual([]);
    expect(await search('%_ ()')).toEqual([]);
    await expect(search("май' |:*")).resolves.toEqual([PRODUCT_UUID, SECOND_PRODUCT_UUID]);
  });

  it('обновляет поиск после переименования товара и бренда', async () => {
    await runner.query("UPDATE product SET name = 'Рубашка' WHERE uuid = $1", [PRODUCT_UUID]);
    expect(await search('рубаш')).toEqual([PRODUCT_UUID]);
    expect(await search('май')).toEqual([SECOND_PRODUCT_UUID]);
    await runner.query("UPDATE brand SET name = 'Фабрика Восток' WHERE code = 'north'");
    expect(await search('Север')).toEqual([]);
    expect(await search('Восток')).toEqual([PRODUCT_UUID]);
  });

  it('исключает архивный вариант и возвращает его после восстановления', async () => {
    await runner.query("UPDATE variant SET status = 'archived' WHERE uuid = $1", [VARIANT_UUID]);
    expect(await search('син')).toEqual([]);
    await runner.query("UPDATE variant SET status = 'active', name = 'Зелёная' WHERE uuid = $1", [VARIANT_UUID]);
    expect(await search('син')).toEqual([]);
    expect(await search('зел')).toEqual([PRODUCT_UUID]);
  });

  it('использует единственный поисковый GIN-индекс', async () => {
    const indexes = await runner.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = current_schema() AND indexdef LIKE '%USING gin%'
    `);
    expect(indexes).toEqual([{ indexname: 'product_search_vector_idx' }]);
    await runner.query('SET LOCAL enable_seqscan = off');
    const plan = await runner.query(
      `
      EXPLAIN (FORMAT JSON) SELECT uuid FROM product
      WHERE search_vector @@ product_search_query($1)
    `,
      ['май'],
    );
    expect(JSON.stringify(plan)).toContain('product_search_vector_idx');
    await runner.query('SET LOCAL enable_seqscan = on');
  });

  it('обратная миграция удаляет только поисковую инфраструктуру', async () => {
    await migration.down(runner);
    expect(await runner.query('SELECT count(*)::integer AS count FROM product')).toEqual([{ count: 2 }]);
    await migration.up(runner);
    expect(await search('Север син')).toEqual([PRODUCT_UUID]);
  });
});
