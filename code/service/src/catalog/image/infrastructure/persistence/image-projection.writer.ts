import { Injectable } from '@nestjs/common';

import { Image } from '../../domain/image';

interface SqlExecutor {
  query(query: string, parameters?: unknown[]): Promise<unknown>;
}

@Injectable()
export class ImageProjectionWriter {
  async insertIfAbsent(executor: SqlExecutor, image: Image): Promise<void> {
    await executor.query(
      `INSERT INTO image (uuid, file_name, version)
       VALUES ($1, $2, $3)
       ON CONFLICT (uuid) DO NOTHING`,
      [image.uuid, image.fileName, image.version],
    );
  }

  async upsertIfNewer(executor: SqlExecutor, image: Image): Promise<void> {
    await executor.query(
      `INSERT INTO image (uuid, file_name, version)
       VALUES ($1, $2, $3)
       ON CONFLICT (uuid) DO UPDATE
       SET file_name = EXCLUDED.file_name, version = EXCLUDED.version
       WHERE image.version < EXCLUDED.version`,
      [image.uuid, image.fileName, image.version],
    );
  }
}
