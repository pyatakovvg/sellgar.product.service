import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateImageDto } from './dto/create-image.dto';
import { UpdateImageDto } from './dto/update-image.dto';

import { ImageModel } from '../image.model';
import { ImageEntity } from '../image.entity';

@Injectable()
export class ImageRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(dto: CreateImageDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(ImageModel)
        .values({
          uuid: dto.uuid,
          fileName: dto.name,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select(['image.uuid', 'image.version', 'image.fileName'])
        .from(ImageModel, 'image')
        .where('image.uuid = :uuid', { uuid: dto.uuid })
        .getOneOrFail();

      await runner.commitTransaction();

      const instanceResult = plainToInstance(ImageEntity, result);

      await validateOrReject(instanceResult);

      return instanceResult;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async update(dto: UpdateImageDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const image = await runner.manager
        .createQueryBuilder(ImageModel, 'image')
        .setLock('pessimistic_write')
        .where('image.uuid = :uuid', { uuid: dto.uuid })
        .getOne();

      if (!image) {
        throw new NotFoundException(`Image ${dto.uuid} not found`);
      }

      if (image.version !== dto.version) {
        throw new ConflictException(`Image ${dto.uuid} was changed by another request`);
      }

      await runner.manager
        .createQueryBuilder()
        .update(ImageModel)
        .set({
          fileName: dto.name,
          version: () => 'version + 1',
        })
        .where('uuid = :uuid', { uuid: dto.uuid })
        .andWhere('version = :version', { version: dto.version })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select(['image.uuid', 'image.version', 'image.fileName'])
        .from(ImageModel, 'image')
        .where('image.uuid = :uuid', { uuid: dto.uuid })
        .getOneOrFail();

      await runner.commitTransaction();

      const instanceResult = plainToInstance(ImageEntity, result);

      await validateOrReject(instanceResult);

      return instanceResult;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}
