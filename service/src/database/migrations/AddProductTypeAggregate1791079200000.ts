import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductTypeAggregate1791079200000 implements MigrationInterface {
  name = 'AddProductTypeAggregate1791079200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE property ADD CONSTRAINT property_code_kind_unique UNIQUE (code, kind)');
    await queryRunner.query(`
      CREATE TABLE product_type (
        uuid uuid PRIMARY KEY,
        name varchar(256) NOT NULL,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT product_type_version_positive CHECK (version > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE type_product_field (
        type_uuid uuid NOT NULL,
        property_code varchar(256) NOT NULL,
        property_kind property_kind_enum NOT NULL,
        required boolean NOT NULL DEFAULT false,
        multiple boolean NOT NULL DEFAULT false,
        sort_order integer NOT NULL DEFAULT 0,
        PRIMARY KEY (type_uuid, property_code),
        CONSTRAINT type_product_field_sort_order_nonnegative CHECK (sort_order >= 0),
        CONSTRAINT type_product_field_boolean_single CHECK (NOT (property_kind = 'BOOLEAN' AND multiple = true)),
        CONSTRAINT type_product_field_type_fk FOREIGN KEY (type_uuid) REFERENCES product_type(uuid) ON DELETE CASCADE,
        CONSTRAINT type_product_field_property_fk FOREIGN KEY (property_code, property_kind) REFERENCES property(code, kind) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE type_variant_field (
        type_uuid uuid NOT NULL,
        property_code varchar(256) NOT NULL,
        property_kind property_kind_enum NOT NULL,
        required boolean NOT NULL DEFAULT false,
        multiple boolean NOT NULL DEFAULT false,
        sort_order integer NOT NULL DEFAULT 0,
        PRIMARY KEY (type_uuid, property_code),
        CONSTRAINT type_variant_field_sort_order_nonnegative CHECK (sort_order >= 0),
        CONSTRAINT type_variant_field_boolean_single CHECK (NOT (property_kind = 'BOOLEAN' AND multiple = true)),
        CONSTRAINT type_variant_field_type_fk FOREIGN KEY (type_uuid) REFERENCES product_type(uuid) ON DELETE CASCADE,
        CONSTRAINT type_variant_field_property_fk FOREIGN KEY (property_code, property_kind) REFERENCES property(code, kind) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query('CREATE INDEX type_product_field_property_idx ON type_product_field(property_code)');
    await queryRunner.query('CREATE INDEX type_variant_field_property_idx ON type_variant_field(property_code)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE type_variant_field');
    await queryRunner.query('DROP TABLE type_product_field');
    await queryRunner.query('DROP TABLE product_type');
    await queryRunner.query('ALTER TABLE property DROP CONSTRAINT property_code_kind_unique');
  }
}
