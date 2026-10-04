import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';

import { UnitModel } from '../unit.model';
import { UnitEntity } from '../unit.entity';

@Injectable()
export class UnitRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count() {
    return this.dataSource.createQueryBuilder().select().from(UnitModel, 'unit').getCount();
  }

  async findAll() {
    const result = await this.dataSource
      .createQueryBuilder()
      .select(['unit.uuid', 'unit.version', 'unit.code', 'unit.name', 'unit.description', 'unit.createdAt', 'unit.updatedAt'])
      .from(UnitModel, 'unit')
      .orderBy('unit.createdAt', 'DESC')
      .getMany();

    const resultInstance = result.map((entity) => plainToInstance(UnitEntity, entity));

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select(['unit.uuid', 'unit.version', 'unit.code', 'unit.name', 'unit.description', 'unit.createdAt', 'unit.updatedAt'])
      .from(UnitModel, 'unit')
      .where('unit.uuid = :uuid', { uuid })
      .getOneOrFail();

    const resultInstance = plainToInstance(UnitEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(dto: CreateUnitDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(UnitModel)
        .values({
          uuid: newUuid,
          code: dto.code,
          name: dto.name,
          description: dto.description,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select(['unit.uuid', 'unit.version', 'unit.code', 'unit.name', 'unit.description', 'unit.createdAt', 'unit.updatedAt'])
        .from(UnitModel, 'unit')
        .where('unit.uuid = :uuid', { uuid: newUuid })
        .getOneOrFail();

      await runner.commitTransaction();

      const instanceResult = plainToInstance(UnitEntity, result);

      await validateOrReject(instanceResult);

      return instanceResult;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async update(dto: UpdateUnitDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const unit = await runner.manager
        .createQueryBuilder(UnitModel, 'unit')
        .setLock('pessimistic_write')
        .where('unit.uuid = :uuid', { uuid: dto.uuid })
        .getOne();

      if (!unit) {
        throw new NotFoundException(`Unit ${dto.uuid} not found`);
      }

      if (unit.version !== dto.version) {
        throw new ConflictException(`Unit ${dto.uuid} was changed by another request`);
      }

      await runner.manager
        .createQueryBuilder()
        .update(UnitModel)
        .set({
          code: dto.code,
          name: dto.name,
          description: dto.description,
          version: () => 'version + 1',
        })
        .where('uuid = :uuid', { uuid: dto.uuid })
        .andWhere('version = :version', { version: dto.version })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select(['unit.uuid', 'unit.version', 'unit.code', 'unit.name', 'unit.description', 'unit.createdAt', 'unit.updatedAt'])
        .from(UnitModel, 'unit')
        .where('unit.uuid = :uuid', { uuid: dto.uuid })
        .getOneOrFail();

      await runner.commitTransaction();

      const instanceResult = plainToInstance(UnitEntity, result);

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
