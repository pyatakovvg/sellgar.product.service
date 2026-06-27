import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { BrandModel } from '../brand.model';

import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

import { BrandEntity } from '../brand.entity';

@Injectable()
export class BrandRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async count() {
    return await this.dataSource.createQueryBuilder().select().from(BrandModel, 'brand').getCount();
  }

  async findAll() {
    const result = await this.dataSource
      .createQueryBuilder()
      .select(['brand.uuid', 'brand.code', 'brand.name', 'brand.description', 'brand.createdAt', 'brand.updatedAt'])
      .from(BrandModel, 'brand')
      .orderBy('brand.createdAt', 'DESC')
      .getMany();

    const resultInstance = result.map((entity) => plainToInstance(BrandEntity, entity));

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select(['brand.uuid', 'brand.code', 'brand.name', 'brand.description', 'brand.createdAt', 'brand.updatedAt'])
      .from(BrandModel, 'brand')
      .where('brand.uuid = :uuid', { uuid })
      .getOneOrFail();

    const resultInstance = plainToInstance(BrandEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(createBrandDto: CreateBrandDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(BrandModel)
        .values({
          uuid: newUuid,
          code: createBrandDto.code,
          name: createBrandDto.name,
          description: createBrandDto.description,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select(['brand.uuid', 'brand.code', 'brand.name', 'brand.description', 'brand.createdAt', 'brand.updatedAt'])
        .from(BrandModel, 'brand')
        .where('brand.uuid = :uuid', { uuid: newUuid })
        .getOneOrFail();

      const instanceResult = plainToInstance(BrandEntity, result);

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

  async update(dto: UpdateBrandDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    console.log('Brand update dto:', dto);

    try {
      await runner.manager
        .createQueryBuilder()
        .update(BrandModel)
        .set({
          code: dto.code,
          name: dto.name,
          description: dto.description,
        })
        .where('brand.uuid = :uuid', { uuid: dto.uuid })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select(['brand.uuid', 'brand.code', 'brand.name', 'brand.description', 'brand.createdAt', 'brand.updatedAt'])
        .from(BrandModel, 'brand')
        .where('brand.uuid = :uuid', { uuid: dto.uuid })
        .getOneOrFail();

      console.log('Brand updated:', result);

      const instanceResult = plainToInstance(BrandEntity, result);

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

  remove(id: number) {
    return `This action removes a #${id} category`;
  }
}
