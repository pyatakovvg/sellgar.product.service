import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductFullTextSearch1792022400000 implements MigrationInterface {
  name = 'AddProductFullTextSearch1792022400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE product ADD COLUMN search_vector tsvector NOT NULL DEFAULT ''::tsvector");

    await queryRunner.query(`
      CREATE FUNCTION product_search_query(term text) RETURNS tsquery
      LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
        SELECT coalesce(string_agg(
          '(' || (
            to_tsquery('simple', quote_literal(token) || ':*') ||
            plainto_tsquery('russian', token)
          )::text || ')', ' & ' ORDER BY token
        ), '')::tsquery
        FROM unnest(tsvector_to_array(to_tsvector('simple', term))) AS tokens(token)
      $$
    `);

    await queryRunner.query(`
      CREATE FUNCTION product_search_document(product_id uuid) RETURNS tsvector
      LANGUAGE sql STABLE STRICT AS $$
        SELECT
          setweight(to_tsvector('simple', p.name) || to_tsvector('russian', p.name), 'A') ||
          setweight(
            to_tsvector('simple', b.name) || to_tsvector('russian', b.name), 'B'
          ) ||
          setweight(
            to_tsvector('simple', coalesce(v.names, '')) ||
            to_tsvector('russian', coalesce(v.names, '')), 'B'
          )
        FROM product p
        JOIN brand b ON b.code = p.brand_code
        LEFT JOIN LATERAL (
          SELECT string_agg(name, ' ' ORDER BY uuid) AS names
          FROM variant WHERE product_uuid = p.uuid AND status = 'active'
        ) v ON true
        WHERE p.uuid = product_id
      $$
    `);

    await queryRunner.query(`
      CREATE FUNCTION refresh_product_search(product_id uuid) RETURNS void
      LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM 1 FROM product WHERE uuid = product_id FOR UPDATE;
        UPDATE product SET search_vector = product_search_document(product_id)
        WHERE uuid = product_id;
      END;
      $$
    `);

    await queryRunner.query(`
      CREATE FUNCTION product_search_changed() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          IF OLD.name IS NOT DISTINCT FROM NEW.name
            AND OLD.brand_code IS NOT DISTINCT FROM NEW.brand_code THEN
            RETURN NEW;
          END IF;
        END IF;
        PERFORM refresh_product_search(NEW.uuid);
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER product_search_changed
      AFTER INSERT OR UPDATE OF name, brand_code ON product
      FOR EACH ROW EXECUTE FUNCTION product_search_changed()
    `);

    await queryRunner.query(`
      CREATE FUNCTION variant_product_search_changed() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          PERFORM refresh_product_search(OLD.product_uuid);
          RETURN OLD;
        END IF;
        IF TG_OP = 'UPDATE' THEN
          IF OLD.name IS NOT DISTINCT FROM NEW.name
            AND OLD.status IS NOT DISTINCT FROM NEW.status
            AND OLD.product_uuid IS NOT DISTINCT FROM NEW.product_uuid THEN
            RETURN NEW;
          END IF;
          IF OLD.product_uuid IS DISTINCT FROM NEW.product_uuid THEN
            PERFORM refresh_product_search(OLD.product_uuid);
          END IF;
        END IF;
        PERFORM refresh_product_search(NEW.product_uuid);
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER variant_product_search_changed
      AFTER INSERT OR DELETE OR UPDATE OF name, status, product_uuid ON variant
      FOR EACH ROW EXECUTE FUNCTION variant_product_search_changed()
    `);

    await queryRunner.query(`
      CREATE FUNCTION brand_product_search_changed() RETURNS trigger
      LANGUAGE plpgsql AS $$
      DECLARE product_id uuid;
      BEGIN
        FOR product_id IN SELECT uuid FROM product WHERE brand_code = NEW.code ORDER BY uuid LOOP
          PERFORM refresh_product_search(product_id);
        END LOOP;
        RETURN NEW;
      END;
      $$
    `);
    await queryRunner.query(`
      CREATE TRIGGER brand_product_search_changed
      AFTER UPDATE OF name ON brand
      FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name)
      EXECUTE FUNCTION brand_product_search_changed()
    `);

    await queryRunner.query('UPDATE product SET search_vector = product_search_document(uuid)');
    await queryRunner.query('CREATE INDEX product_search_vector_idx ON product USING GIN (search_vector)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER brand_product_search_changed ON brand');
    await queryRunner.query('DROP TRIGGER variant_product_search_changed ON variant');
    await queryRunner.query('DROP TRIGGER product_search_changed ON product');
    await queryRunner.query('DROP FUNCTION brand_product_search_changed()');
    await queryRunner.query('DROP FUNCTION variant_product_search_changed()');
    await queryRunner.query('DROP FUNCTION product_search_changed()');
    await queryRunner.query('DROP FUNCTION refresh_product_search(uuid)');
    await queryRunner.query('DROP FUNCTION product_search_document(uuid)');
    await queryRunner.query('DROP FUNCTION product_search_query(text)');
    await queryRunner.query('DROP INDEX product_search_vector_idx');
    await queryRunner.query('ALTER TABLE product DROP COLUMN search_vector');
  }
}
