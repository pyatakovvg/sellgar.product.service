import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateDto } from './dto/create.dto';
import { UpdateDto } from './dto/update.dto';

import { ShopModel } from '../shop.model';
import { ShopEntity } from '../shop.entity';

@Injectable()
export class ShopRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count() {
    return this.dataSource.createQueryBuilder(ShopModel, 'shop').getCount();
  }

  async findAll() {
    const result = await this.dataSource.createQueryBuilder(ShopModel, 'shop').select().getMany();

    const resultInstance = result.map((entity) =>
      plainToInstance(ShopEntity, entity, {
        strategy: 'excludeAll',
      }),
    );

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder(ShopModel, 'shop')
      .where('shop.uuid = :uuid', { uuid })
      .getOneOrFail();

    const resultInstance = plainToInstance(ShopEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(dto: CreateDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(ShopModel)
        .values({
          uuid: newUuid,
          name: dto.name,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder(ShopModel, 'shop')
        .where('shop.uuid = :uuid', { uuid: newUuid })
        .getOneOrFail();

      const resultInstance = plainToInstance(ShopEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);
      await runner.commitTransaction();

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async update(dto: UpdateDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.manager
        .createQueryBuilder()
        .update(ShopModel)
        .set({
          name: dto.name,
        })
        .where('shop.uuid = :uuid', { uuid: dto.uuid })
        .execute();

      const result = await runner.manager
        .createQueryBuilder(ShopModel, 'shop')
        .where('store.uuid = :uuid', { uuid: dto.uuid })
        .getOneOrFail();

      const resultInstance = plainToInstance(ShopEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);
      await runner.commitTransaction();

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}
