import { MigrationInterface, QueryRunner } from 'typeorm';

export class UseUuidProductIdentityAndMessaging1791086400000 implements MigrationInterface {
  name = 'UseUuidProductIdentityAndMessaging1791086400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Compatibility path for development databases created before Product and Variant
    // were corrected to use their existing UUID identity.
    if (await queryRunner.hasColumn('product', 'code')) {
      await queryRunner.query('ALTER TABLE product ADD COLUMN uuid uuid NOT NULL DEFAULT gen_random_uuid()');
      await queryRunner.query('ALTER TABLE variant ADD COLUMN uuid uuid NOT NULL DEFAULT gen_random_uuid()');
      await queryRunner.query('ALTER TABLE product ALTER COLUMN uuid DROP DEFAULT');
      await queryRunner.query('ALTER TABLE variant ALTER COLUMN uuid DROP DEFAULT');
      await queryRunner.query('ALTER TABLE variant ADD COLUMN product_uuid uuid');
      await queryRunner.query(
        'UPDATE variant SET product_uuid = product.uuid FROM product WHERE variant.product_code = product.code',
      );
      await queryRunner.query('ALTER TABLE variant ALTER COLUMN product_uuid SET NOT NULL');

      await queryRunner.query('ALTER TABLE product_property ADD COLUMN product_uuid uuid');
      await queryRunner.query(
        'UPDATE product_property SET product_uuid = product.uuid FROM product WHERE product_property.product_code = product.code',
      );
      await queryRunner.query('ALTER TABLE product_property ALTER COLUMN product_uuid SET NOT NULL');
      await queryRunner.query('ALTER TABLE product_property_value ADD COLUMN product_uuid uuid');
      await queryRunner.query(
        'UPDATE product_property_value SET product_uuid = product.uuid FROM product WHERE product_property_value.product_code = product.code',
      );
      await queryRunner.query('ALTER TABLE product_property_value ALTER COLUMN product_uuid SET NOT NULL');

      await queryRunner.query('ALTER TABLE variant_property ADD COLUMN variant_uuid uuid');
      await queryRunner.query(
        'UPDATE variant_property SET variant_uuid = variant.uuid FROM variant WHERE variant_property.variant_code = variant.code',
      );
      await queryRunner.query('ALTER TABLE variant_property ALTER COLUMN variant_uuid SET NOT NULL');
      await queryRunner.query('ALTER TABLE variant_property_value ADD COLUMN variant_uuid uuid');
      await queryRunner.query(
        'UPDATE variant_property_value SET variant_uuid = variant.uuid FROM variant WHERE variant_property_value.variant_code = variant.code',
      );
      await queryRunner.query('ALTER TABLE variant_property_value ALTER COLUMN variant_uuid SET NOT NULL');
      await queryRunner.query('ALTER TABLE variant_image ADD COLUMN variant_uuid uuid');
      await queryRunner.query(
        'UPDATE variant_image SET variant_uuid = variant.uuid FROM variant WHERE variant_image.variant_code = variant.code',
      );
      await queryRunner.query('ALTER TABLE variant_image ALTER COLUMN variant_uuid SET NOT NULL');

      for (const constraint of [
        'variant_product_fk',
        'product_property_product_fk',
        'variant_property_variant_fk',
        'product_property_value_assignment_fk',
        'variant_property_value_assignment_fk',
        'variant_image_variant_fk',
      ]) {
        const table = this.constraintTable(constraint);
        await queryRunner.query(`ALTER TABLE ${table} DROP CONSTRAINT ${constraint}`);
      }
      await queryRunner.query('ALTER TABLE product DROP CONSTRAINT product_code_type_unique');
      await queryRunner.query('ALTER TABLE variant DROP CONSTRAINT variant_code_type_unique');
      await queryRunner.query('ALTER TABLE product_property DROP CONSTRAINT product_property_value_owner_unique');
      await queryRunner.query('ALTER TABLE variant_property DROP CONSTRAINT variant_property_value_owner_unique');
      for (const table of [
        'variant_image',
        'variant_property_value',
        'product_property_value',
        'variant_property',
        'product_property',
        'variant',
        'product',
      ]) {
        await queryRunner.query(`ALTER TABLE ${table} DROP CONSTRAINT ${table}_pkey`);
      }
      await queryRunner.query('DROP INDEX variant_product_idx');

      await queryRunner.query('ALTER TABLE variant DROP COLUMN product_code');
      await queryRunner.query('ALTER TABLE product_property DROP COLUMN product_code');
      await queryRunner.query('ALTER TABLE product_property_value DROP COLUMN product_code');
      await queryRunner.query('ALTER TABLE variant_property DROP COLUMN variant_code');
      await queryRunner.query('ALTER TABLE variant_property_value DROP COLUMN variant_code');
      await queryRunner.query('ALTER TABLE variant_image DROP COLUMN variant_code');
      await queryRunner.query('ALTER TABLE variant DROP COLUMN code');
      await queryRunner.query('ALTER TABLE product DROP COLUMN code');

      await queryRunner.query('ALTER TABLE product ADD CONSTRAINT product_pkey PRIMARY KEY (uuid)');
      await queryRunner.query('ALTER TABLE product ADD CONSTRAINT product_uuid_type_unique UNIQUE (uuid, type_uuid)');
      await queryRunner.query('ALTER TABLE variant ADD CONSTRAINT variant_pkey PRIMARY KEY (uuid)');
      await queryRunner.query('ALTER TABLE variant ADD CONSTRAINT variant_uuid_type_unique UNIQUE (uuid, type_uuid)');
      await queryRunner.query(
        'ALTER TABLE product_property ADD CONSTRAINT product_property_pkey PRIMARY KEY (product_uuid, type_uuid, property_code)',
      );
      await queryRunner.query(
        'ALTER TABLE product_property ADD CONSTRAINT product_property_value_owner_unique UNIQUE (product_uuid, type_uuid, property_code, property_kind)',
      );
      await queryRunner.query(
        'ALTER TABLE variant_property ADD CONSTRAINT variant_property_pkey PRIMARY KEY (variant_uuid, type_uuid, property_code)',
      );
      await queryRunner.query(
        'ALTER TABLE variant_property ADD CONSTRAINT variant_property_value_owner_unique UNIQUE (variant_uuid, type_uuid, property_code, property_kind)',
      );
      await queryRunner.query(
        'ALTER TABLE product_property_value ADD CONSTRAINT product_property_value_pkey PRIMARY KEY (product_uuid, type_uuid, property_code, position)',
      );
      await queryRunner.query(
        'ALTER TABLE variant_property_value ADD CONSTRAINT variant_property_value_pkey PRIMARY KEY (variant_uuid, type_uuid, property_code, position)',
      );
      await queryRunner.query(
        'ALTER TABLE variant_image ADD CONSTRAINT variant_image_pkey PRIMARY KEY (variant_uuid, image_uuid)',
      );

      await queryRunner.query(
        'ALTER TABLE variant ADD CONSTRAINT variant_product_fk FOREIGN KEY (product_uuid, type_uuid) REFERENCES product(uuid, type_uuid) ON DELETE RESTRICT',
      );
      await queryRunner.query(
        'ALTER TABLE product_property ADD CONSTRAINT product_property_product_fk FOREIGN KEY (product_uuid, type_uuid) REFERENCES product(uuid, type_uuid) ON DELETE CASCADE',
      );
      await queryRunner.query(
        'ALTER TABLE variant_property ADD CONSTRAINT variant_property_variant_fk FOREIGN KEY (variant_uuid, type_uuid) REFERENCES variant(uuid, type_uuid) ON DELETE CASCADE',
      );
      await queryRunner.query(
        'ALTER TABLE product_property_value ADD CONSTRAINT product_property_value_assignment_fk FOREIGN KEY (product_uuid, type_uuid, property_code, property_kind) REFERENCES product_property(product_uuid, type_uuid, property_code, property_kind) ON DELETE CASCADE',
      );
      await queryRunner.query(
        'ALTER TABLE variant_property_value ADD CONSTRAINT variant_property_value_assignment_fk FOREIGN KEY (variant_uuid, type_uuid, property_code, property_kind) REFERENCES variant_property(variant_uuid, type_uuid, property_code, property_kind) ON DELETE CASCADE',
      );
      await queryRunner.query(
        'ALTER TABLE variant_image ADD CONSTRAINT variant_image_variant_fk FOREIGN KEY (variant_uuid) REFERENCES variant(uuid) ON DELETE CASCADE',
      );
      await queryRunner.query('CREATE INDEX variant_product_idx ON variant(product_uuid)');
    }

    await queryRunner.query(`
      CREATE TABLE outbox_event (
        uuid uuid PRIMARY KEY,
        producer varchar(128) NOT NULL,
        aggregate_type varchar(128) NOT NULL,
        aggregate_id varchar(256) NOT NULL,
        aggregate_version integer NOT NULL,
        event_type varchar(256) NOT NULL,
        schema_version integer NOT NULL,
        payload jsonb NOT NULL,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        published_at timestamptz,
        next_attempt_at timestamptz DEFAULT now(),
        processing_started_at timestamptz,
        status varchar(64) NOT NULL DEFAULT 'pending',
        attempts integer NOT NULL DEFAULT 0,
        last_error text,
        CONSTRAINT outbox_aggregate_version_unique UNIQUE (aggregate_type, aggregate_id, aggregate_version)
      )
    `);
    await queryRunner.query('CREATE INDEX outbox_publish_idx ON outbox_event(status, next_attempt_at, occurred_at)');
    await queryRunner.query(`
      CREATE TABLE inbox_event (
        event_uuid uuid PRIMARY KEY,
        producer varchar(128) NOT NULL,
        schema_version integer NOT NULL,
        event_type varchar(256) NOT NULL,
        aggregate_type varchar(128) NOT NULL,
        aggregate_id varchar(256) NOT NULL,
        aggregate_version integer NOT NULL,
        received_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz,
        status varchar(32) NOT NULL,
        attempts integer NOT NULL DEFAULT 1,
        last_error text,
        CONSTRAINT inbox_aggregate_version_unique UNIQUE (aggregate_type, aggregate_id, aggregate_version)
      )
    `);
  }

  async down(): Promise<void> {
    throw new Error('Product identity migration cannot be reversed without restoring discarded business codes');
  }

  private constraintTable(constraint: string): string {
    if (constraint.startsWith('product_property_value_')) return 'product_property_value';
    if (constraint.startsWith('variant_property_value_')) return 'variant_property_value';
    if (constraint.startsWith('product_property_')) return 'product_property';
    if (constraint.startsWith('variant_property_')) return 'variant_property';
    if (constraint.startsWith('variant_image_')) return 'variant_image';
    return 'variant';
  }
}
