import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EntityManager } from 'typeorm';

import { CreatePropertyDto, PropertyOptionDto, PropertyOptionMetadataDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

import { PropertyModel, PropertyTypeEnum } from '../property.model';
import { PropertyEntity } from '../property.entity';
import { PropertyOptionModel } from '../property-option.model';
import { PropertyOptionMetadataModel, PropertyOptionMetadataValueTypeEnum } from '../property-option-metadata.model';

@Injectable()
export class PropertyRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count() {
    return this.dataSource.createQueryBuilder().select().from(PropertyModel, 'property').getCount();
  }

  async findAll() {
    const builder = this.dataSource
      .createQueryBuilder(PropertyModel, 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .leftJoinAndSelect('property.options', 'options')
      .leftJoinAndSelect('options.metadata', 'optionMetadata')
      .orderBy('property.createdAt', 'DESC')
      .addOrderBy('options.sortOrder', 'ASC')
      .addOrderBy('options.name', 'ASC')
      .addOrderBy('optionMetadata.sortOrder', 'ASC')
      .addOrderBy('optionMetadata.valueType', 'ASC');

    const result = await builder.getMany();

    const resultInstance = result.map((entity) => plainToInstance(PropertyEntity, entity));

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const builder = this.dataSource
      .createQueryBuilder(PropertyModel, 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .leftJoinAndSelect('property.options', 'options')
      .leftJoinAndSelect('options.metadata', 'optionMetadata')
      .where('property.uuid = :uuid', { uuid })
      .orderBy('options.sortOrder', 'ASC')
      .addOrderBy('options.name', 'ASC')
      .addOrderBy('optionMetadata.sortOrder', 'ASC')
      .addOrderBy('optionMetadata.valueType', 'ASC');

    const result = await builder.getOneOrFail();

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
      const options = this.normalizeOptions(dto);

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
          unitUuid: dto.unitUuid,
        })
        .execute();

      await this.syncOptions(runner.manager, newUuid, options);

      const result = await runner.manager
        .createQueryBuilder(PropertyModel, 'property')
        .leftJoinAndSelect('property.unit', 'unit')
        .leftJoinAndSelect('property.options', 'options')
        .leftJoinAndSelect('options.metadata', 'optionMetadata')
        .where('property.uuid = :uuid', { uuid: newUuid })
        .orderBy('options.sortOrder', 'ASC')
        .addOrderBy('options.name', 'ASC')
        .addOrderBy('optionMetadata.sortOrder', 'ASC')
        .addOrderBy('optionMetadata.valueType', 'ASC')
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
          unitUuid: dto.unitUuid,
          version: () => 'version + 1',
        })
        .where('uuid = :uuid', { uuid: dto.uuid })
        .andWhere('version = :version', { version: dto.version })
        .execute();

      await this.syncOptions(runner.manager, dto.uuid, this.normalizeOptions(dto));

      const result = await runner.manager
        .createQueryBuilder(PropertyModel, 'property')
        .leftJoinAndSelect('property.unit', 'unit')
        .leftJoinAndSelect('property.options', 'options')
        .leftJoinAndSelect('options.metadata', 'optionMetadata')
        .where('property.uuid = :uuid', { uuid: dto.uuid })
        .orderBy('options.sortOrder', 'ASC')
        .addOrderBy('options.name', 'ASC')
        .addOrderBy('optionMetadata.sortOrder', 'ASC')
        .addOrderBy('optionMetadata.valueType', 'ASC')
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

  private async syncOptions(manager: EntityManager, propertyUuid: string, options: PropertyOptionDto[]) {
    const incomingUuids = options.map((option) => option.uuid).filter((value): value is string => Boolean(value));

    await manager
      .createQueryBuilder()
      .delete()
      .from(PropertyOptionModel)
      .where('property_uuid = :propertyUuid', { propertyUuid })
      .andWhere(incomingUuids.length > 0 ? 'uuid NOT IN (:...incomingUuids)' : '1=1', { incomingUuids })
      .execute();

    for (const [index, option] of options.entries()) {
      const optionUuid = option.uuid ?? uuid.v4();

      if (option.uuid) {
        await manager
          .createQueryBuilder()
          .update(PropertyOptionModel)
          .set({
            code: option.code,
            name: option.name,
            sortOrder: option.sortOrder ?? index,
            version: () => 'version + 1',
          })
          .where('uuid = :uuid', { uuid: option.uuid })
          .andWhere('property_uuid = :propertyUuid', { propertyUuid })
          .execute();
      } else {
        await manager
          .createQueryBuilder()
          .insert()
          .into(PropertyOptionModel)
          .values({
            uuid: optionUuid,
            propertyUuid,
            code: option.code,
            name: option.name,
            sortOrder: option.sortOrder ?? index,
          })
          .execute();
      }

      await this.syncOptionMetadata(manager, optionUuid, option.metadata ?? []);
    }
  }

  private async syncOptionMetadata(manager: EntityManager, optionUuid: string, metadata: PropertyOptionMetadataDto[]) {
    await manager
      .createQueryBuilder()
      .delete()
      .from(PropertyOptionMetadataModel)
      .where('option_uuid = :optionUuid', { optionUuid })
      .execute();

    for (const [index, item] of metadata.entries()) {
      const value = this.normalizeOptionMetadata(item, index);

      await manager
        .createQueryBuilder()
        .insert()
        .into(PropertyOptionMetadataModel)
        .values({
          uuid: item.uuid ?? uuid.v4(),
          optionUuid,
          ...value,
        })
        .execute();
    }
  }

  private normalizeOptions(dto: CreatePropertyDto) {
    if (dto.type !== PropertyTypeEnum.OPTION) {
      return [];
    }

    const options = dto.options ?? [];

    if (options.length === 0) {
      throw new BadRequestException('Option property must have at least one option');
    }

    const seenCodes = new Set<string>();
    const normalizedOptions = options.map((option) => ({
      ...option,
      code: option.code.trim(),
      name: option.name.trim(),
      metadata: option.metadata ?? [],
    }));

    for (const option of normalizedOptions) {
      const code = option.code;

      if (!code) {
        throw new BadRequestException('Property option code is required');
      }

      if (!option.name) {
        throw new BadRequestException('Property option name is required');
      }

      if (seenCodes.has(code)) {
        throw new BadRequestException(`Property option code ${code} is duplicated`);
      }

      seenCodes.add(code);
    }

    return normalizedOptions;
  }

  private normalizeOptionMetadata(metadata: PropertyOptionMetadataDto, index: number) {
    const value = {
      valueType: metadata.valueType,
      sortOrder: metadata.sortOrder ?? index,
      textValue: null as string | null,
      colorValue: null as string | null,
      fileUuid: null as string | null,
      iconCode: null as string | null,
    };

    switch (metadata.valueType) {
      case PropertyOptionMetadataValueTypeEnum.TEXT: {
        const textValue = metadata.textValue?.trim();

        if (!textValue) {
          throw new BadRequestException('Property option metadata text value is required');
        }

        return { ...value, textValue };
      }
      case PropertyOptionMetadataValueTypeEnum.COLOR: {
        const colorValue = metadata.colorValue?.trim();

        if (!colorValue) {
          throw new BadRequestException('Property option metadata color value is required');
        }

        if (!/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
          throw new BadRequestException('Property option metadata must be a HEX color');
        }

        return { ...value, colorValue: colorValue.toUpperCase() };
      }
      case PropertyOptionMetadataValueTypeEnum.IMAGE:
        if (!metadata.fileUuid) {
          throw new BadRequestException('Property option metadata file UUID is required');
        }

        return { ...value, fileUuid: metadata.fileUuid };
      case PropertyOptionMetadataValueTypeEnum.ICON: {
        const iconCode = metadata.iconCode?.trim();

        if (!iconCode) {
          throw new BadRequestException('Property option metadata icon value is required');
        }

        return { ...value, iconCode };
      }
      default:
        throw new BadRequestException(`Unsupported property option metadata type: ${metadata.valueType}`);
    }
  }
}
