import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyAggregate1791075600000 implements MigrationInterface {
  name = 'AddPropertyAggregate1791075600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE property_kind_enum AS ENUM ('TEXT', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'OPTIONS')`);
    await queryRunner.query(`CREATE TYPE property_option_extra_kind_enum AS ENUM ('TEXT', 'COLOR', 'IMAGE')`);
    await queryRunner.query(`CREATE TYPE property_option_text_display_enum AS ENUM ('TEXT', 'ICON')`);
    await queryRunner.query(`
      CREATE TABLE property (
        code varchar(256) PRIMARY KEY,
        name varchar(256) NOT NULL,
        description text,
        kind property_kind_enum NOT NULL,
        unit_code varchar(256),
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT property_version_positive CHECK (version > 0),
        CONSTRAINT property_unit_fk FOREIGN KEY (unit_code) REFERENCES unit(code) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE property_option (
        property_code varchar(256) NOT NULL,
        code varchar(256) NOT NULL,
        name varchar(256) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        PRIMARY KEY (property_code, code),
        CONSTRAINT property_option_sort_order_nonnegative CHECK (sort_order >= 0),
        CONSTRAINT property_option_property_fk FOREIGN KEY (property_code) REFERENCES property(code) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE property_option_extra (
        property_code varchar(256) NOT NULL,
        option_code varchar(256) NOT NULL,
        type property_option_extra_kind_enum NOT NULL,
        sort_order integer NOT NULL,
        text_display property_option_text_display_enum,
        value_text text,
        value_color varchar(9),
        image_uuid uuid,
        PRIMARY KEY (property_code, option_code, type, sort_order),
        CONSTRAINT property_option_extra_sort_order_nonnegative CHECK (sort_order >= 0),
        CONSTRAINT property_option_extra_value_shape CHECK (
          (type = 'TEXT' AND value_text IS NOT NULL AND text_display IS NOT NULL AND value_color IS NULL AND image_uuid IS NULL)
          OR (type = 'COLOR' AND value_text IS NULL AND text_display IS NULL AND value_color IS NOT NULL AND image_uuid IS NULL)
          OR (type = 'IMAGE' AND value_text IS NULL AND text_display IS NULL AND value_color IS NULL AND image_uuid IS NOT NULL)
        ),
        CONSTRAINT property_option_extra_option_fk
          FOREIGN KEY (property_code, option_code) REFERENCES property_option(property_code, code) ON DELETE CASCADE,
        CONSTRAINT property_option_extra_image_fk FOREIGN KEY (image_uuid) REFERENCES image(uuid) ON DELETE RESTRICT
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE property_option_extra');
    await queryRunner.query('DROP TABLE property_option');
    await queryRunner.query('DROP TABLE property');
    await queryRunner.query('DROP TYPE property_option_text_display_enum');
    await queryRunner.query('DROP TYPE property_option_extra_kind_enum');
    await queryRunner.query('DROP TYPE property_kind_enum');
  }
}
