import { BadRequestException, Injectable } from '@nestjs/common';

import { PropertyEntity } from '../entity/property.entity';
import { PropertyPageEntity } from '../entity/property-page.entity';
import { PropertyKind } from '../property-kind.enum';
import { PropertyOptionExtraKind } from '../property-option-extra-kind.enum';
import { PropertyOptionTextDisplay } from '../property-option-text-display.enum';
import { PropertyRepository } from '../repository/property.repository';
import { CreatePropertyCommand } from './command/create-property.command';
import { PropertyOptionCommand } from './command/property-option.command';
import { PropertyOptionExtraCommand } from './command/property-option-extra.command';
import { UpdatePropertyCommand } from './command/update-property.command';
import { UpdatePropertyOptionCommand } from './command/update-property-option.command';

@Injectable()
export class PropertyService {
  constructor(private readonly propertyRepository: PropertyRepository) {}

  async getAll(limit: number, offset: number): Promise<PropertyPageEntity> {
    const page = await this.propertyRepository.getAll(limit, offset);
    return { ...page, items: page.items.map(PropertyEntity.fromModel) };
  }

  async getByCode(code: string): Promise<PropertyEntity> {
    return PropertyEntity.fromModel(await this.propertyRepository.getByCode(code));
  }

  async create(command: CreatePropertyCommand): Promise<PropertyEntity> {
    const options = this.normalizeOptions(command.kind, command.options ?? []);
    const normalized = new CreatePropertyCommand(
      command.code,
      command.name,
      command.kind,
      command.description,
      command.unitCode,
      options,
    );
    return PropertyEntity.fromModel(await this.propertyRepository.create(normalized));
  }

  async update(command: UpdatePropertyCommand): Promise<PropertyEntity> {
    return PropertyEntity.fromModel(await this.propertyRepository.update(command));
  }

  async createOption(code: string, version: number, input: PropertyOptionCommand): Promise<PropertyEntity> {
    const option = this.normalizeOption(input, 0);
    return PropertyEntity.fromModel(await this.propertyRepository.createOption(code, version, option));
  }

  async updateOption(command: UpdatePropertyOptionCommand): Promise<PropertyEntity> {
    const extras = command.extras === undefined ? undefined : this.normalizeExtras(command.extras);
    return PropertyEntity.fromModel(await this.propertyRepository.updateOption(new UpdatePropertyOptionCommand(
      command.code,
      command.optionCode,
      command.version,
      command.name,
      command.sortOrder,
      extras,
    )));
  }

  private normalizeOptions(kind: PropertyKind, options: PropertyOptionCommand[]): PropertyOptionCommand[] {
    if (kind !== PropertyKind.OPTIONS && options.length > 0) {
      throw new BadRequestException(`Property kind ${kind} cannot contain options`);
    }
    const codes = new Set<string>();
    return options.map((option, index) => {
      if (codes.has(option.code)) throw new BadRequestException(`Duplicate option code ${option.code}`);
      codes.add(option.code);
      return this.normalizeOption(option, index);
    });
  }

  private normalizeOption(option: PropertyOptionCommand, defaultOrder: number): PropertyOptionCommand {
    return new PropertyOptionCommand(
      option.code,
      option.name,
      option.sortOrder ?? defaultOrder,
      this.normalizeExtras(option.extras ?? []),
    );
  }

  private normalizeExtras(extras: PropertyOptionExtraCommand[]): PropertyOptionExtraCommand[] {
    const keys = new Set<string>();
    return extras.map((extra, index) => {
      const normalized = this.normalizeExtra(extra, index);
      const key = `${normalized.type}:${normalized.sortOrder}`;
      if (keys.has(key)) throw new BadRequestException(`Duplicate option extra position ${key}`);
      keys.add(key);
      return normalized;
    });
  }

  private normalizeExtra(extra: PropertyOptionExtraCommand, defaultOrder: number): PropertyOptionExtraCommand {
    const sortOrder = extra.sortOrder ?? defaultOrder;
    if (extra.type === PropertyOptionExtraKind.TEXT) {
      if (extra.valueText === undefined || extra.valueColor !== undefined || extra.imageUuid !== undefined) {
        throw new BadRequestException('TEXT option extra requires only valueText');
      }
      return new PropertyOptionExtraCommand(
        extra.type,
        sortOrder,
        extra.textDisplay ?? PropertyOptionTextDisplay.TEXT,
        extra.valueText,
      );
    }
    if (extra.type === PropertyOptionExtraKind.COLOR) {
      if (extra.valueColor === undefined || extra.valueText !== undefined || extra.imageUuid !== undefined || extra.textDisplay !== undefined) {
        throw new BadRequestException('COLOR option extra requires only valueColor');
      }
      return new PropertyOptionExtraCommand(extra.type, sortOrder, undefined, undefined, extra.valueColor.toUpperCase());
    }
    if (extra.type === PropertyOptionExtraKind.IMAGE) {
      if (extra.imageUuid === undefined || extra.valueText !== undefined || extra.valueColor !== undefined || extra.textDisplay !== undefined) {
        throw new BadRequestException('IMAGE option extra requires only imageUuid');
      }
      return new PropertyOptionExtraCommand(extra.type, sortOrder, undefined, undefined, undefined, extra.imageUuid.toLowerCase());
    }
    throw new BadRequestException('Unsupported option extra type');
  }
}
