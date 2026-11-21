import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseVariableDecimalScale1795262400000 implements MigrationInterface {
  name = 'UseVariableDecimalScale1795262400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION normalize_property_decimal() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        NEW.value_decimal := trim_scale(NEW.value_decimal);
        RETURN NEW;
      END;
      $$
    `);

    for (const table of ['product_property_value', 'variant_property_value']) {
      await queryRunner.query(`
        ALTER TABLE ${table}
          ALTER COLUMN value_decimal TYPE numeric USING trim_scale(value_decimal),
          ADD CONSTRAINT ${table}_decimal_bounds
            CHECK (scale(value_decimal) <= 12 AND abs(value_decimal) < 100000000000000000000000000)
      `);
      await queryRunner.query(`
        CREATE TRIGGER ${table}_normalize_decimal
        BEFORE INSERT OR UPDATE OF value_decimal ON ${table}
        FOR EACH ROW EXECUTE FUNCTION normalize_property_decimal()
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['product_property_value', 'variant_property_value']) {
      await queryRunner.query(`DROP TRIGGER ${table}_normalize_decimal ON ${table}`);
      await queryRunner.query(`
        ALTER TABLE ${table}
          DROP CONSTRAINT ${table}_decimal_bounds,
          ALTER COLUMN value_decimal TYPE numeric(38,12)
      `);
    }

    await queryRunner.query('DROP FUNCTION normalize_property_decimal()');
  }
}
