import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreatePropertyGroupDto } from './dto/create-property-group.dto';
import { UpdatePropertyGroupDto } from './dto/update-property-group.dto';

import { PropertyGroupModel } from '../property-group.model';
import { PropertyGroupEntity } from '../property-group.entity';

@Injectable()
export class PropertyGroupRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count() {
    return this.dataSource.createQueryBuilder().select().from(PropertyGroupModel, 'property_group').getCount();
  }

  async findAll() {
    const builder = this.dataSource
      .createQueryBuilder()
      .select([
        'property_group.uuid',
        'property_group.version',
        'property_group.name',
        'property_group.description',
        'property_group.createdAt',
        'property_group.updatedAt',
      ])
      .from(PropertyGroupModel, 'property_group')
      .orderBy('property_group.name', 'ASC')
      .leftJoinAndSelect('property_group.properties', 'properties')
      .addOrderBy('properties.name', 'ASC')
      .leftJoinAndSelect('properties.unit', 'unit')
      .addOrderBy('unit.name', 'ASC');

    const result = await builder.getMany();

    const resultInstance = result.map((entity) => plainToInstance(PropertyGroupEntity, entity));

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .select([
        'property_group.uuid',
        'property_group.version',
        'property_group.name',
        'property_group.description',
        'property_group.createdAt',
        'property_group.updatedAt',
      ])
      .from(PropertyGroupModel, 'property_group')
      .leftJoinAndSelect('property_group.properties', 'properties')
      .leftJoinAndSelect('properties.unit', 'unit')
      .where('property_group.uuid = :uuid', { uuid })
      .getOneOrFail();

    const resultInstance = plainToInstance(PropertyGroupEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(dto: CreatePropertyGroupDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(PropertyGroupModel)
        .values({
          uuid: newUuid,
          name: dto.name,
          description: dto.description,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select([
          'property_group.uuid',
          'property_group.version',
          'property_group.name',
          'property_group.description',
          'property_group.createdAt',
          'property_group.updatedAt',
        ])
        .from(PropertyGroupModel, 'property_group')
        .leftJoinAndSelect('property_group.properties', 'properties')
        .leftJoinAndSelect('properties.unit', 'unit')
        .where('property_group.uuid = :uuid', { uuid: newUuid })
        .getOneOrFail();

      const instanceResult = plainToInstance(PropertyGroupEntity, result);

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

  async update(dto: UpdatePropertyGroupDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const propertyGroup = await runner.manager
        .createQueryBuilder(PropertyGroupModel, 'propertyGroup')
        .setLock('pessimistic_write')
        .where('propertyGroup.uuid = :uuid', { uuid: dto.uuid })
        .getOne();

      if (!propertyGroup) {
        throw new NotFoundException(`Property group ${dto.uuid} not found`);
      }

      if (propertyGroup.version !== dto.version) {
        throw new ConflictException(`Property group ${dto.uuid} was changed by another request`);
      }

      await runner.manager
        .createQueryBuilder()
        .update(PropertyGroupModel)
        .set({
          name: dto.name,
          description: dto.description,
          version: () => 'version + 1',
        })
        .where('uuid = :uuid', { uuid: dto.uuid })
        .andWhere('version = :version', { version: dto.version })
        .execute();

      const result = await runner.manager
        .createQueryBuilder()
        .select([
          'property_group.uuid',
          'property_group.version',
          'property_group.name',
          'property_group.description',
          'property_group.createdAt',
          'property_group.updatedAt',
        ])
        .from(PropertyGroupModel, 'property_group')
        .leftJoinAndSelect('property_group.properties', 'properties')
        .leftJoinAndSelect('properties.unit', 'unit')
        .where('property_group.uuid = :uuid', { uuid: dto.uuid })
        .getOneOrFail();

      const instanceResult = plainToInstance(PropertyGroupEntity, result);

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
