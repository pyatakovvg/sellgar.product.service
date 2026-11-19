import 'reflect-metadata';

import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

import { Image } from '../../../domain/image';
import { TypeOrmImageRepository } from './typeorm-image.repository';
import { ImageProjectionWriter } from '../image-projection.writer';

function postgresBinaryDirectory(): string {
  const directory =
    process.env.PG_BIN ??
    spawnSync('pg_config', ['--bindir'], {
      encoding: 'utf8',
      timeout: 5000,
      killSignal: 'SIGKILL',
    }).stdout?.trim();
  if (!directory || !existsSync(join(directory, 'postgres')) || !existsSync(join(directory, 'initdb'))) {
    throw new Error('Image integration tests require PostgreSQL 16+ binaries; set PG_BIN or install pg_config.');
  }
  return directory;
}
const imageUuid = '11111111-1111-4111-8111-111111111111';
const otherUuid = '22222222-2222-4222-8222-222222222222';

/** Runs the repository's actual parameterized SQL without opening a server socket. */
class DisposablePostgres {
  private readonly postgresBin = postgresBinaryDirectory();
  private readonly directory = mkdtempSync(join(tmpdir(), 'sellgar-image-projection-'));
  private readonly dataDirectory = join(this.directory, 'data');

  initialize(): void {
    const initialized = spawnSync(
      join(this.postgresBin, 'initdb'),
      ['-D', this.dataDirectory, '-A', 'trust', '--no-locale', '--encoding=UTF8'],
      { encoding: 'utf8', timeout: 15000, killSignal: 'SIGKILL' },
    );
    if (initialized.error || initialized.status !== 0) {
      throw new Error(initialized.error?.message ?? initialized.stderr);
    }
    this.execute(`CREATE TABLE image (
      uuid uuid PRIMARY KEY,
      file_name varchar(256) NOT NULL,
      version integer NOT NULL DEFAULT 1 CONSTRAINT image_version_positive CHECK(version > 0)
    );`);
  }

  execute(sql: string): void {
    const inputPath = join(this.directory, 'query.sql');
    writeFileSync(inputPath, `${sql}\n`);
    const input = openSync(inputPath, 'r');
    try {
      const result = spawnSync(
        join(this.postgresBin, 'postgres'),
        ['--single', '-D', this.dataDirectory, '-j', 'postgres'],
        { stdio: [input, 'pipe', 'pipe'], encoding: 'utf8', timeout: 10000, killSignal: 'SIGKILL' },
      );
      const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
      // Single-user PostgreSQL may exit zero even after a SQL error.
      if (result.error || result.status !== 0 || /\b(?:ERROR|FATAL):/.test(output)) {
        throw new Error(result.error?.message ?? output);
      }
    } finally {
      closeSync(input);
    }
  }

  async query(sql: string, parameters: unknown[] = []): Promise<unknown[]> {
    const argumentsSql = parameters.map(sqlLiteral).join(', ');
    this.execute(`PREPARE image_projection AS ${sql}; EXECUTE image_projection(${argumentsSql});`);
    return [];
  }

  expectImage(uuid: string, name: string, version: number): void {
    this.execute(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM image WHERE uuid = ${sqlLiteral(uuid)}
        AND file_name = ${sqlLiteral(name)} AND version = ${version}) THEN
        RAISE EXCEPTION 'Unexpected image projection';
      END IF;
    END $$;`);
  }

  dispose(): void {
    rmSync(this.directory, { recursive: true, force: true });
  }
}

function sqlLiteral(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  throw new Error('Unexpected test SQL parameter');
}

describe('TypeOrmImageRepository projection ordering (PostgreSQL 16)', () => {
  let postgres: DisposablePostgres;
  let repository: TypeOrmImageRepository;

  beforeAll(() => {
    postgres = new DisposablePostgres();
    postgres.initialize();
    repository = new TypeOrmImageRepository(
      {
        query: (sql: string, parameters: unknown[]) => postgres.query(sql, parameters),
      } as unknown as DataSource,
      new ImageProjectionWriter(),
    );
  }, 30000);

  beforeEach(() => postgres.execute('TRUNCATE image;'));
  afterAll(() => postgres?.dispose());

  it('inserts unversioned CREATE at version 1 and ignores a repeated CREATE', async () => {
    await repository.insertIfAbsent(new Image(imageUuid, 'original.png', 1));
    await repository.insertIfAbsent(new Image(imageUuid, 'duplicate.png', 1));
    postgres.expectImage(imageUuid, 'original.png', 1);
  });

  it('uses UPDATE.version as the previous version, preserving the legacy contract', async () => {
    await repository.insertIfAbsent(new Image(imageUuid, 'original.png', 1));
    await repository.upsertIfNewer(new Image(imageUuid, 'renamed.png', 2));
    postgres.expectImage(imageUuid, 'renamed.png', 2);
  });

  it('ignores duplicate updates even when their repeated filename differs', async () => {
    await repository.insertIfAbsent(new Image(imageUuid, 'original.png', 1));
    await repository.upsertIfNewer(new Image(imageUuid, 'first.png', 2));
    await repository.upsertIfNewer(new Image(imageUuid, 'duplicate.png', 2));
    postgres.expectImage(imageUuid, 'first.png', 2);
  });

  it('does not let a stale UPDATE or late CREATE overwrite a newer projection', async () => {
    await repository.upsertIfNewer(new Image(imageUuid, 'newest.png', 5));
    await repository.upsertIfNewer(new Image(imageUuid, 'stale.png', 2));
    await repository.insertIfAbsent(new Image(imageUuid, 'late-create.png', 1));
    postgres.expectImage(imageUuid, 'newest.png', 5);
  });

  it('fast-forwards across a missing update using the complete projected filename', async () => {
    await repository.insertIfAbsent(new Image(imageUuid, 'original.png', 1));
    await repository.upsertIfNewer(new Image(imageUuid, 'after-gap.png', 8));
    postgres.expectImage(imageUuid, 'after-gap.png', 8);
  });

  it('seeds an unknown projection from UPDATE before CREATE without resetting it later', async () => {
    await repository.upsertIfNewer(new Image(imageUuid, 'known-from-update.png', 3));
    await repository.insertIfAbsent(new Image(imageUuid, 'original.png', 1));
    postgres.expectImage(imageUuid, 'known-from-update.png', 3);
  });

  it('keeps independently identified files separate and preserves parameterized filenames', async () => {
    await repository.insertIfAbsent(new Image(imageUuid, "kid's shirt.png", 1));
    await repository.insertIfAbsent(new Image(otherUuid, 'other.png', 1));
    await repository.upsertIfNewer(new Image(otherUuid, 'other-new.png', 2));
    postgres.expectImage(imageUuid, "kid's shirt.png", 1);
    postgres.expectImage(otherUuid, 'other-new.png', 2);
  });
});
