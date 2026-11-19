import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';

import { PropertyKind } from '../property-kind.enum';
import { PropertyOptionExtraModel } from '../property-option-extra.model';
import { PropertyOptionModel } from '../property-option.model';
import { PropertyModel } from '../property.model';
import { CreatePropertyCommand } from '../service/command/create-property.command';
import { PropertyOptionCommand } from '../service/command/property-option.command';
import { PropertyOptionExtraCommand } from '../service/command/property-option-extra.command';
import { UpdatePropertyCommand } from '../service/command/update-property.command';
import { UpdatePropertyOptionCommand } from '../service/command/update-property-option.command';
import { ProductOutboxService } from '../../../integration/outbox/product-outbox.service';

@Injectable()
export class PropertyRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly productOutbox: ProductOutboxService,
  ) {}

  async getAll(
    limit: number,
    offset: number,
  ): Promise<{ items: PropertyModel[]; total: number; limit: number; offset: number }> {
    const [items, total] = await this.dataSource.getRepository(PropertyModel).findAndCount({
      relations: { options: { extras: true } },
      order: {
        code: 'ASC',
        options: { sortOrder: 'ASC', code: 'ASC', extras: { sortOrder: 'ASC', type: 'ASC' } },
      },
      take: limit,
      skip: offset,
    });
    return { items, total, limit, offset };
  }

  getByCode(code: string): Promise<PropertyModel> {
    return this.readProperty(this.dataSource.manager, code);
  }

  async create(dto: CreatePropertyCommand): Promise<PropertyModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.insert(PropertyModel, {
          code: dto.code,
          name: dto.name,
          description: dto.description ?? null,
          kind: dto.kind,
          unitCode: dto.unitCode ?? null,
          version: 1,
        });
        for (const option of dto.options ?? []) await this.insertOption(manager, dto.code, option);
        return this.readProperty(manager, dto.code);
      });
    } catch (error) {
      throw this.mapWriteError(error, dto.code);
    }
  }

  update(dto: UpdatePropertyCommand): Promise<PropertyModel> {
    return this.dataSource.transaction(async (manager) => {
      const property = await this.lockProperty(manager, dto.code, dto.version);
      const name = dto.name ?? property.name;
      const description = dto.description === undefined ? property.description : dto.description;
      if (name === property.name && description === property.description) return this.readProperty(manager, dto.code);

      property.name = name;
      property.description = description;
      property.version += 1;
      await manager.save(PropertyModel, property);
      await this.productOutbox.touchByProperty(manager, dto.code);
      return this.readProperty(manager, dto.code);
    });
  }

  async createOption(propertyCode: string, version: number, option: PropertyOptionCommand): Promise<PropertyModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const property = await this.lockProperty(manager, propertyCode, version);
        this.assertOptionsProperty(property);
        await this.insertOption(manager, propertyCode, option);
        property.version += 1;
        await manager.save(PropertyModel, property);
        await this.productOutbox.touchByProperty(manager, propertyCode);
        return this.readProperty(manager, propertyCode);
      });
    } catch (error) {
      throw this.mapWriteError(error, propertyCode);
    }
  }

  async updateOption(dto: UpdatePropertyOptionCommand): Promise<PropertyModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const property = await this.lockProperty(manager, dto.code, dto.version);
        this.assertOptionsProperty(property);
        const option = await manager.findOne(PropertyOptionModel, {
          where: { propertyCode: dto.code, code: dto.optionCode },
          lock: { mode: 'pessimistic_write' },
        });
        if (!option) throw new NotFoundException(`Option ${dto.code}/${dto.optionCode} not found`);
        option.extras = await manager.find(PropertyOptionExtraModel, {
          where: { propertyCode: dto.code, optionCode: dto.optionCode },
          order: { sortOrder: 'ASC', type: 'ASC' },
        });

        const name = dto.name ?? option.name;
        const sortOrder = dto.sortOrder ?? option.sortOrder;
        const extrasChanged = dto.extras !== undefined && !this.sameExtras(option.extras, dto.extras);
        if (name === option.name && sortOrder === option.sortOrder && !extrasChanged) {
          return this.readProperty(manager, dto.code);
        }

        if (name !== option.name || sortOrder !== option.sortOrder) {
          await manager.update(
            PropertyOptionModel,
            { propertyCode: dto.code, code: dto.optionCode },
            { name, sortOrder },
          );
        }
        if (dto.extras !== undefined) await this.replaceExtras(manager, dto.code, dto.optionCode, dto.extras);
        property.version += 1;
        await manager.save(PropertyModel, property);
        await this.productOutbox.touchByProperty(manager, dto.code);
        return this.readProperty(manager, dto.code);
      });
    } catch (error) {
      throw this.mapWriteError(error, dto.code);
    }
  }

  private async lockProperty(manager: EntityManager, code: string, version: number): Promise<PropertyModel> {
    const property = await manager.findOne(PropertyModel, { where: { code }, lock: { mode: 'pessimistic_write' } });
    if (!property) throw new NotFoundException(`Property ${code} not found`);
    if (property.version !== version) throw new ConflictException(`Property ${code} was changed by another request`);
    return property;
  }

  private assertOptionsProperty(property: PropertyModel): void {
    if (property.kind !== PropertyKind.OPTIONS) {
      throw new BadRequestException(`Property ${property.code} does not accept options`);
    }
  }

  private async insertOption(
    manager: EntityManager,
    propertyCode: string,
    option: PropertyOptionCommand,
  ): Promise<void> {
    await manager.insert(PropertyOptionModel, {
      propertyCode,
      code: option.code,
      name: option.name,
      sortOrder: option.sortOrder ?? 0,
    });
    await this.insertExtras(manager, propertyCode, option.code, option.extras ?? []);
  }

  private async replaceExtras(
    manager: EntityManager,
    propertyCode: string,
    optionCode: string,
    extras: PropertyOptionCommand['extras'],
  ): Promise<void> {
    await manager.delete(PropertyOptionExtraModel, { propertyCode, optionCode });
    await this.insertExtras(manager, propertyCode, optionCode, extras ?? []);
  }

  private async insertExtras(
    manager: EntityManager,
    propertyCode: string,
    optionCode: string,
    extras: NonNullable<PropertyOptionCommand['extras']>,
  ): Promise<void> {
    if (extras.length === 0) return;
    await manager.insert(
      PropertyOptionExtraModel,
      extras.map((extra) => ({
        propertyCode,
        optionCode,
        type: extra.type,
        sortOrder: extra.sortOrder ?? 0,
        textDisplay: extra.textDisplay ?? null,
        valueText: extra.valueText ?? null,
        valueColor: extra.valueColor ?? null,
        imageUuid: extra.imageUuid ?? null,
      })),
    );
  }

  private sameExtras(
    current: PropertyOptionExtraModel[],
    incoming: NonNullable<PropertyOptionCommand['extras']>,
  ): boolean {
    const normalize = (extra: {
      type: PropertyOptionExtraCommand['type'];
      sortOrder?: number;
      textDisplay?: PropertyOptionExtraModel['textDisplay'];
      valueText?: string | null;
      valueColor?: string | null;
      imageUuid?: string | null;
    }) => ({
      type: extra.type,
      sortOrder: extra.sortOrder,
      textDisplay: extra.textDisplay ?? null,
      valueText: extra.valueText ?? null,
      valueColor: extra.valueColor ?? null,
      imageUuid: extra.imageUuid ?? null,
    });
    return (
      JSON.stringify(current.map(normalize).sort(this.compareExtras)) ===
      JSON.stringify(incoming.map(normalize).sort(this.compareExtras))
    );
  }

  private readonly compareExtras = (
    left: { sortOrder?: number; type: string },
    right: { sortOrder?: number; type: string },
  ) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.type.localeCompare(right.type);

  private async readProperty(manager: EntityManager, code: string): Promise<PropertyModel> {
    const property = await manager.findOne(PropertyModel, {
      where: { code },
      relations: { options: { extras: true } },
      order: { options: { sortOrder: 'ASC', code: 'ASC', extras: { sortOrder: 'ASC', type: 'ASC' } } },
    });
    if (!property) throw new NotFoundException(`Property ${code} not found`);
    return property;
  }

  private mapWriteError(error: unknown, code: string): unknown {
    if (!(error instanceof QueryFailedError)) return error;
    const databaseCode = (error.driverError as { code?: string }).code;
    if (databaseCode === '23505') return new ConflictException(`Property or option code already exists for ${code}`);
    if (databaseCode === '23503')
      return new BadRequestException(`Property ${code} references an unknown unit or image`);
    if (databaseCode === '23514') return new BadRequestException(`Property ${code} violates a value constraint`);
    return error;
  }
}
