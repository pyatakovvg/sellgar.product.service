import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductAggregate1791082800000 implements MigrationInterface {
  name = 'AddProductAggregate1791082800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE type_product_field ADD CONSTRAINT type_product_field_kind_unique UNIQUE (type_uuid, property_code, property_kind)');
    await queryRunner.query('ALTER TABLE type_variant_field ADD CONSTRAINT type_variant_field_kind_unique UNIQUE (type_uuid, property_code, property_kind)');
    await queryRunner.query(`CREATE TYPE product_status_enum AS ENUM ('active', 'archived')`);
    await queryRunner.query(`
      CREATE TABLE product (
        code varchar(256) PRIMARY KEY,
        type_uuid uuid NOT NULL,
        name varchar(256) NOT NULL,
        description text,
        brand_code varchar(256) NOT NULL,
        status product_status_enum NOT NULL DEFAULT 'active',
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT product_version_positive CHECK (version > 0),
        CONSTRAINT product_code_type_unique UNIQUE (code, type_uuid),
        CONSTRAINT product_type_fk FOREIGN KEY (type_uuid) REFERENCES product_type(uuid) ON DELETE RESTRICT,
        CONSTRAINT product_brand_fk FOREIGN KEY (brand_code) REFERENCES brand(code) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE variant (
        code varchar(256) PRIMARY KEY,
        product_code varchar(256) NOT NULL,
        type_uuid uuid NOT NULL,
        name varchar(256) NOT NULL,
        description text,
        status product_status_enum NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT variant_code_type_unique UNIQUE (code, type_uuid),
        CONSTRAINT variant_product_fk FOREIGN KEY (product_code, type_uuid) REFERENCES product(code, type_uuid) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE product_property (
        product_code varchar(256) NOT NULL,
        type_uuid uuid NOT NULL,
        property_code varchar(256) NOT NULL,
        property_kind property_kind_enum NOT NULL,
        PRIMARY KEY (product_code, type_uuid, property_code),
        CONSTRAINT product_property_value_owner_unique UNIQUE (product_code, type_uuid, property_code, property_kind),
        CONSTRAINT product_property_product_fk FOREIGN KEY (product_code, type_uuid) REFERENCES product(code, type_uuid) ON DELETE CASCADE,
        CONSTRAINT product_property_type_field_fk FOREIGN KEY (type_uuid, property_code, property_kind)
          REFERENCES type_product_field(type_uuid, property_code, property_kind) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE variant_property (
        variant_code varchar(256) NOT NULL,
        type_uuid uuid NOT NULL,
        property_code varchar(256) NOT NULL,
        property_kind property_kind_enum NOT NULL,
        PRIMARY KEY (variant_code, type_uuid, property_code),
        CONSTRAINT variant_property_value_owner_unique UNIQUE (variant_code, type_uuid, property_code, property_kind),
        CONSTRAINT variant_property_variant_fk FOREIGN KEY (variant_code, type_uuid) REFERENCES variant(code, type_uuid) ON DELETE CASCADE,
        CONSTRAINT variant_property_type_field_fk FOREIGN KEY (type_uuid, property_code, property_kind)
          REFERENCES type_variant_field(type_uuid, property_code, property_kind) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(this.createValueTable('product_property_value', 'product_code', 'product_property', 'product_property_value_assignment_fk'));
    await queryRunner.query(this.createValueTable('variant_property_value', 'variant_code', 'variant_property', 'variant_property_value_assignment_fk'));
    await queryRunner.query(`
      CREATE TABLE variant_image (
        variant_code varchar(256) NOT NULL,
        image_uuid uuid NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        PRIMARY KEY (variant_code, image_uuid),
        CONSTRAINT variant_image_sort_order_nonnegative CHECK (sort_order >= 0),
        CONSTRAINT variant_image_variant_fk FOREIGN KEY (variant_code) REFERENCES variant(code) ON DELETE CASCADE,
        CONSTRAINT variant_image_image_fk FOREIGN KEY (image_uuid) REFERENCES image(uuid) ON DELETE RESTRICT
      )
    `);
    await this.createValueIndexes(queryRunner, 'product_property_value');
    await this.createValueIndexes(queryRunner, 'variant_property_value');
    await queryRunner.query('CREATE INDEX product_type_idx ON product(type_uuid)');
    await queryRunner.query('CREATE INDEX product_brand_idx ON product(brand_code)');
    await queryRunner.query('CREATE INDEX variant_product_idx ON variant(product_code)');
    await queryRunner.query(`
      CREATE FUNCTION prevent_catalog_record_delete() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION '% records must be archived, not deleted', TG_TABLE_NAME USING ERRCODE = '23514';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query('CREATE TRIGGER product_prevent_delete BEFORE DELETE ON product FOR EACH ROW EXECUTE FUNCTION prevent_catalog_record_delete()');
    await queryRunner.query('CREATE TRIGGER variant_prevent_delete BEFORE DELETE ON variant FOR EACH ROW EXECUTE FUNCTION prevent_catalog_record_delete()');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER variant_prevent_delete ON variant');
    await queryRunner.query('DROP TRIGGER product_prevent_delete ON product');
    await queryRunner.query('DROP FUNCTION prevent_catalog_record_delete');
    await queryRunner.query('DROP TABLE variant_image');
    await queryRunner.query('DROP TABLE variant_property_value');
    await queryRunner.query('DROP TABLE product_property_value');
    await queryRunner.query('DROP TABLE variant_property');
    await queryRunner.query('DROP TABLE product_property');
    await queryRunner.query('DROP TABLE variant');
    await queryRunner.query('DROP TABLE product');
    await queryRunner.query('DROP TYPE product_status_enum');
    await queryRunner.query('ALTER TABLE type_variant_field DROP CONSTRAINT type_variant_field_kind_unique');
    await queryRunner.query('ALTER TABLE type_product_field DROP CONSTRAINT type_product_field_kind_unique');
  }

  private createValueTable(table: string, ownerColumn: string, assignmentTable: string, assignmentConstraint: string): string {
    const ownerPrefix = ownerColumn === 'product_code' ? 'product' : 'variant';
    return `
      CREATE TABLE ${table} (
        ${ownerColumn} varchar(256) NOT NULL,
        type_uuid uuid NOT NULL,
        property_code varchar(256) NOT NULL,
        position integer NOT NULL,
        property_kind property_kind_enum NOT NULL,
        value_text text,
        value_integer bigint,
        value_decimal numeric(38,12),
        value_boolean boolean,
        value_date date,
        value_option_code varchar(256),
        PRIMARY KEY (${ownerColumn}, type_uuid, property_code, position),
        CONSTRAINT ${table}_position_nonnegative CHECK (position >= 0),
        CONSTRAINT ${table}_shape CHECK (
          (property_kind = 'TEXT' AND value_text IS NOT NULL AND value_integer IS NULL AND value_decimal IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_option_code IS NULL)
          OR (property_kind = 'INTEGER' AND value_text IS NULL AND value_integer IS NOT NULL AND value_decimal IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_option_code IS NULL)
          OR (property_kind = 'DECIMAL' AND value_text IS NULL AND value_integer IS NULL AND value_decimal IS NOT NULL AND value_boolean IS NULL AND value_date IS NULL AND value_option_code IS NULL)
          OR (property_kind = 'BOOLEAN' AND value_text IS NULL AND value_integer IS NULL AND value_decimal IS NULL AND value_boolean IS NOT NULL AND value_date IS NULL AND value_option_code IS NULL)
          OR (property_kind = 'DATE' AND value_text IS NULL AND value_integer IS NULL AND value_decimal IS NULL AND value_boolean IS NULL AND value_date IS NOT NULL AND value_option_code IS NULL)
          OR (property_kind = 'OPTIONS' AND value_text IS NULL AND value_integer IS NULL AND value_decimal IS NULL AND value_boolean IS NULL AND value_date IS NULL AND value_option_code IS NOT NULL)
        ),
        CONSTRAINT ${assignmentConstraint} FOREIGN KEY (${ownerColumn}, type_uuid, property_code, property_kind)
          REFERENCES ${assignmentTable}(${ownerColumn}, type_uuid, property_code, property_kind) ON DELETE CASCADE,
        CONSTRAINT ${ownerPrefix}_property_value_option_fk FOREIGN KEY (property_code, value_option_code)
          REFERENCES property_option(property_code, code) ON DELETE RESTRICT
      )
    `;
  }

  private async createValueIndexes(queryRunner: QueryRunner, table: string): Promise<void> {
    for (const suffix of ['text', 'integer', 'decimal', 'boolean', 'date', 'option_code']) {
      await queryRunner.query(`CREATE INDEX ${table}_${suffix}_idx ON ${table}(property_code, value_${suffix})`);
    }
  }
}
