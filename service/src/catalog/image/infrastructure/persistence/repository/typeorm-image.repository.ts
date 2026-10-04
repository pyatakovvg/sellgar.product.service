import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ImageRepository } from '../../../application/port/image.repository';
import { Image } from '../../../domain/image';
import { ImageModel } from '../model/image.model';

@Injectable()
export class TypeOrmImageRepository implements ImageRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async insertIfAbsent(image: Image): Promise<void> {
    // CREATE has no source version. A late or repeated CREATE must not reset metadata.
    await this.dataSource.query(
      `INSERT INTO image (uuid, file_name, version)
       VALUES ($1, $2, $3)
       ON CONFLICT (uuid) DO NOTHING`,
      [image.uuid, image.fileName, image.version],
    );
  }

  async upsertIfNewer(image: Image): Promise<void> {
    // Conditional UPSERT makes freshness checking and writing one atomic operation.
    // The payload contains the complete projected filename, so gaps can fast-forward.
    await this.dataSource.query(
      `INSERT INTO image (uuid, file_name, version)
       VALUES ($1, $2, $3)
       ON CONFLICT (uuid) DO UPDATE
       SET file_name = EXCLUDED.file_name, version = EXCLUDED.version
       WHERE image.version < EXCLUDED.version`,
      [image.uuid, image.fileName, image.version],
    );
  }

  async findByUuid(uuid: string): Promise<Image | null> {
    const model = await this.dataSource.getRepository(ImageModel).findOneBy({ uuid });
    return model === null ? null : new Image(model.uuid, model.fileName, model.version);
  }
}
