import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';

import { CreatePriceDto } from './dto/create-price.dto';

import { PriceEntity } from '../price.entity';
import { PriceModel } from '../price.model';

@Injectable()
export class PriceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count(storeUuid: string) {
    return this.dataSource
      .createQueryBuilder(PriceModel, 'price')
      .where('price.storeUuid = :storeUuid', { storeUuid })
      .getCount();
  }

  async findAll(storeUuid: string) {
    const result = await this.dataSource
      .createQueryBuilder(PriceModel, 'price')
      .leftJoinAndSelect('price.currency', 'currency')
      .where('price.storeUuid = :storeUuid', { storeUuid })
      .orderBy('price.createdAt', 'DESC')
      .getMany();

    const resultInstance = result.map((item) =>
      plainToInstance(PriceEntity, item, {
        strategy: 'excludeAll',
      }),
    );

    await Promise.all(resultInstance.map((instance) => validateOrReject(instance)));

    return resultInstance;
  }

  async create(storeUuid: string, dto: CreatePriceDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const insertResult = await runner.manager
        .createQueryBuilder()
        .insert()
        .into(PriceModel)
        .values({
          storeUuid,
          value: dto.value,
          currencyCode: dto.currencyCode,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder(PriceModel, 'price')
        .leftJoinAndSelect('price.currency', 'currency')
        .where('price.uuid = :uuid', { uuid: insertResult.raw[0].uuid })
        .getOneOrFail();

      const instanceResult = plainToInstance(PriceEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(instanceResult);
      await runner.commitTransaction();

      return instanceResult;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}
