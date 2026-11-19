import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPrimitives1791072000000 implements MigrationInterface {
  name = 'InitialPrimitives1791072000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE unit (
        code varchar(256) PRIMARY KEY,
        name varchar(256) NOT NULL,
        symbol varchar(256) NOT NULL,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT unit_version_positive CHECK (version > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE brand (
        code varchar(256) PRIMARY KEY,
        name varchar(256) NOT NULL,
        description text,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT brand_version_positive CHECK (version > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE image (
        uuid uuid PRIMARY KEY,
        file_name varchar(256) NOT NULL,
        version integer NOT NULL DEFAULT 1,
        CONSTRAINT image_version_positive CHECK (version > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE brand_image (
        brand_code varchar(256) NOT NULL,
        image_uuid uuid NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        PRIMARY KEY (brand_code, image_uuid),
        CONSTRAINT brand_image_brand_fk FOREIGN KEY (brand_code) REFERENCES brand(code) ON DELETE RESTRICT,
        CONSTRAINT brand_image_image_fk FOREIGN KEY (image_uuid) REFERENCES image(uuid) ON DELETE RESTRICT,
        CONSTRAINT brand_image_sort_order_nonnegative CHECK (sort_order >= 0)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE brand_image');
    await queryRunner.query('DROP TABLE image');
    await queryRunner.query('DROP TABLE brand');
    await queryRunner.query('DROP TABLE unit');
  }
}
