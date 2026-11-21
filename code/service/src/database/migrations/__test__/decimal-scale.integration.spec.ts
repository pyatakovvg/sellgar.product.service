import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';

import { databaseOptions } from '../../database.options';
import { UseVariableDecimalScale1795262400000 } from '../UseVariableDecimalScale1795262400000';

const describeDatabase = process.env.PRODUCT_DECIMAL_DATABASE_TESTS === '1' ? describe : describe.skip;

describeDatabase('Decimal property storage migration on PostgreSQL', () => {
  const schema = `decimal_scale_test_${randomUUID().replaceAll('-', '')}`;
  const tables = ['product_property_value', 'variant_property_value'];
  const migration = new UseVariableDecimalScale1795262400000();
  let database: DataSource;
  let runner: QueryRunner;

  beforeAll(async () => {
    database = new DataSource(databaseOptions(process.env));
    await database.initialize();
    runner = database.createQueryRunner();
    await runner.connect();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET search_path TO "${schema}"`);
  });

  afterAll(async () => {
    if (runner) {
      await runner.query('SET search_path TO public');
      await runner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await runner.release();
    }
    if (database?.isInitialized) await database.destroy();
  });

  it('trims existing values, stops padding new writes and preserves bounds through rollback', async () => {
    const examples = ['6.1', '48', '-71.6', '0', '0.000000000001', '99999999999999999999999999.123456789012'];

    for (const table of tables) {
      await runner.query(
        `CREATE TABLE ${table} (id integer GENERATED ALWAYS AS IDENTITY, value_decimal numeric(38,12))`,
      );
      for (const value of [...examples, null]) {
        await runner.query(`INSERT INTO ${table} (value_decimal) VALUES ($1)`, [value]);
      }
      const before = await runner.query(`SELECT value_decimal::text AS value FROM ${table} ORDER BY id`);
      expect(before[0].value).toBe('6.100000000000');
    }

    await migration.up(runner);

    for (const table of tables) {
      const after = await runner.query(`SELECT value_decimal::text AS value FROM ${table} ORDER BY id`);
      expect(after.map((row: { value: string | null }) => row.value)).toEqual([...examples, null]);
      const [inserted] = await runner.query(
        `INSERT INTO ${table} (value_decimal) VALUES ('7.800000000000') RETURNING id, value_decimal::text AS value`,
      );
      expect(inserted.value).toBe('7.8');
      await runner.query(`UPDATE ${table} SET value_decimal = '48.000000000000' WHERE id = $1`, [inserted.id]);
      const [updated] = await runner.query(`SELECT value_decimal::text AS value FROM ${table} WHERE id = $1`, [
        inserted.id,
      ]);
      expect(updated.value).toBe('48');

      for (const invalid of ['100000000000000000000000000', '0.0000000000001', 'NaN', 'Infinity']) {
        await expect(runner.query(`INSERT INTO ${table} (value_decimal) VALUES ($1)`, [invalid])).rejects.toThrow();
      }
    }

    await migration.down(runner);

    for (const table of tables) {
      const [restored] = await runner.query(`SELECT value_decimal::text AS value FROM ${table} ORDER BY id LIMIT 1`);
      expect(restored.value).toBe('6.100000000000');
    }

    await migration.up(runner);

    for (const table of tables) {
      const [restored] = await runner.query(`SELECT value_decimal::text AS value FROM ${table} ORDER BY id LIMIT 1`);
      expect(restored.value).toBe('6.1');
    }
  });
});
