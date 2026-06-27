import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

import { CurrencyModel } from '../currency.model';
import { CurrencyEntity } from '../currency.entity';

@Injectable()
export class CurrencyRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count() {
    return this.dataSource.createQueryBuilder().select().from(CurrencyModel, 'currency').getCount();
  }

  async findAll() {
    const result = await this.dataSource
      .createQueryBuilder()
      .select(['currency.code', 'currency.name', 'currency.order', 'currency.createdAt', 'currency.updatedAt'])
      .from(CurrencyModel, 'currency')
      .orderBy('currency.order', 'ASC')
      .getMany();

    const resultInstance = result.map((entity) => plainToInstance(CurrencyEntity, entity));

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findById(code: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select(['currency.code', 'currency.name', 'currency.order', 'currency.createdAt', 'currency.updatedAt'])
      .from(CurrencyModel, 'currency')
      .where('currency.code = :code', { code })
      .getOneOrFail();

    const resultInstance = plainToInstance(CurrencyEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(dto: CreateCurrencyDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(CurrencyModel)
        .values({
          code: dto.code,
          name: dto.name,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select(['currency.code', 'currency.name', 'currency.order', 'currency.createdAt', 'currency.updatedAt'])
        .from(CurrencyModel, 'currency')
        .where('currency.code = :code', { code: dto.code })
        .getOneOrFail();

      await runner.commitTransaction();

      const instanceResult = plainToInstance(CurrencyEntity, result);

      await validateOrReject(instanceResult);

      return instanceResult;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async update(dto: UpdateCurrencyDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    console.log('Currency update dto:', dto);

    try {
      await runner.manager
        .createQueryBuilder()
        .update(CurrencyModel)
        .set({
          code: dto.code,
          name: dto.name,
        })
        .where('currency.uuid = :uuid', { uuid: dto.uuid })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select(['currency.code', 'currency.name', 'currency.order', 'currency.createdAt', 'currency.updatedAt'])
        .from(CurrencyModel, 'currency')
        .where('currency.code = :code', { code: dto.code })
        .getOneOrFail();

      await runner.commitTransaction();

      console.log('Currency updated:', result);

      const instanceResult = plainToInstance(CurrencyEntity, result);

      await validateOrReject(instanceResult);

      return instanceResult;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async remove() {
    // const result = this.prismaService.currency.delete({
    //   where: { code },
    // });
    // const resultInstance = plainToInstance(CurrencyEntity, result);
    //
    // await validateOrReject(resultInstance);
    //
    // return resultInstance;
  }
}
