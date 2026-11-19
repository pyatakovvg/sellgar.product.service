import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUnitDescription1791806400000 implements MigrationInterface {
  name = 'AddUnitDescription1791806400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE unit ADD COLUMN description text');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE unit DROP COLUMN description');
  }
}
