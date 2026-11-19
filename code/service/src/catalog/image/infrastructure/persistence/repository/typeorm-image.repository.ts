import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ImageRepository } from '../../../application/port/image.repository';
import { Image } from '../../../domain/image';
import { ImageModel } from '../model/image.model';
import { ImageProjectionWriter } from '../image-projection.writer';

@Injectable()
export class TypeOrmImageRepository implements ImageRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly projectionWriter: ImageProjectionWriter,
  ) {}

  async insertIfAbsent(image: Image): Promise<void> {
    await this.projectionWriter.insertIfAbsent(this.dataSource, image);
  }

  async upsertIfNewer(image: Image): Promise<void> {
    await this.projectionWriter.upsertIfNewer(this.dataSource, image);
  }

  async findByUuid(uuid: string): Promise<Image | null> {
    const model = await this.dataSource.getRepository(ImageModel).findOneBy({ uuid });
    return model === null ? null : new Image(model.uuid, model.fileName, model.version);
  }
}
