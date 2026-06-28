import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

import { PropertyModel } from '../property.model';
import { PropertyEntity } from '../property.entity';

@Injectable()
export class PropertyRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count() {
    return this.dataSource.createQueryBuilder().select().from(PropertyModel, 'property').getCount();
  }

  async findAll() {
    const builder = this.dataSource
      .createQueryBuilder()
      .select([
        'property.uuid',
        'property.version',
        'property.code',
        'property.name',
        'property.description',
        'property.type',
        'property.groupUuid',
        'property.unitUuid',
        'property.createdAt',
        'property.updatedAt',
      ])
      .from(PropertyModel, 'property')
      .leftJoinAndSelect('property.group', 'group')
      .leftJoinAndSelect('property.unit', 'unit')
      .orderBy('property.createdAt', 'DESC');

    const result = await builder.getMany();

    console.log('Property result:', result);

    const resultInstance = result.map((entity) => plainToInstance(PropertyEntity, entity));

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const builder = this.dataSource
      .createQueryBuilder()
      .select([
        'property.uuid',
        'property.version',
        'property.code',
        'property.name',
        'property.description',
        'property.type',
        'property.groupUuid',
        'property.unitUuid',
        'property.createdAt',
        'property.updatedAt',
      ])
      .from(PropertyModel, 'property')
      .leftJoinAndSelect('property.group', 'group')
      .leftJoinAndSelect('property.unit', 'unit')
      .where('property.uuid = :uuid', { uuid });

    const result = await builder.getOneOrFail();

    console.log('Property result:', result);

    const resultInstance = plainToInstance(PropertyEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(dto: CreatePropertyDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(PropertyModel)
        .values({
          uuid: newUuid,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          groupUuid: dto.groupUuid,
          unitUuid: dto.unitUuid,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select([
          'property.uuid',
          'property.version',
          'property.code',
          'property.name',
          'property.description',
          'property.type',
          'property.groupUuid',
          'property.unitUuid',
          'property.createdAt',
          'property.updatedAt',
        ])
        .from(PropertyModel, 'property')
        .leftJoinAndSelect('property.group', 'group')
        .leftJoinAndSelect('property.unit', 'unit')
        .where('property.uuid = :uuid', { uuid: newUuid })
        .getOneOrFail();

      const instanceResult = plainToInstance(PropertyEntity, result);

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

  async update(dto: UpdatePropertyDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const property = await runner.manager
        .createQueryBuilder(PropertyModel, 'property')
        .setLock('pessimistic_write')
        .where('property.uuid = :uuid', { uuid: dto.uuid })
        .getOne();

      if (!property) {
        throw new NotFoundException(`Property ${dto.uuid} not found`);
      }

      if (property.version !== dto.version) {
        throw new ConflictException(`Property ${dto.uuid} was changed by another request`);
      }

      await runner.manager
        .createQueryBuilder()
        .update(PropertyModel)
        .set({
          code: dto.code,
          name: dto.name,
          description: dto.description,
          type: dto.type,
          groupUuid: dto.groupUuid,
          unitUuid: dto.unitUuid,
          version: () => 'version + 1',
        })
        .where('uuid = :uuid', { uuid: dto.uuid })
        .andWhere('version = :version', { version: dto.version })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select([
          'property.uuid',
          'property.version',
          'property.code',
          'property.name',
          'property.description',
          'property.type',
          'property.groupUuid',
          'property.unitUuid',
          'property.createdAt',
          'property.updatedAt',
        ])
        .from(PropertyModel, 'property')
        .leftJoinAndSelect('property.group', 'group')
        .leftJoinAndSelect('property.unit', 'unit')
        .where('property.uuid = :uuid', { uuid: dto.uuid })
        .getOneOrFail();

      const instanceResult = plainToInstance(PropertyEntity, result);

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
