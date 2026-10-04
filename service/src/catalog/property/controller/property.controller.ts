import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreatePropertyDto } from './dto/create-property.dto';
import { CreatePropertyOptionDto } from './dto/create-property-option.dto';
import { GetAllPropertiesDto } from './dto/get-all-properties.dto';
import { PropertyCodeDto } from './dto/property-code.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UpdatePropertyOptionDto } from './dto/update-property-option.dto';
import { PropertyService } from '../service/property.service';
import { CreatePropertyCommand } from '../service/command/create-property.command';
import { PropertyOptionCommand } from '../service/command/property-option.command';
import { PropertyOptionExtraCommand } from '../service/command/property-option-extra.command';
import { UpdatePropertyCommand } from '../service/command/update-property.command';
import { UpdatePropertyOptionCommand } from '../service/command/update-property-option.command';
import { PropertyOptionDto } from './dto/property-option.dto';
import { PropertyOptionExtraDto } from './dto/property-option-extra.dto';

@Controller()
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @MessagePattern({ cmd: 'catalog.v2.property.getAll' })
  getAll(@Payload() dto: GetAllPropertiesDto) { return this.propertyService.getAll(dto.limit, dto.offset); }

  @MessagePattern({ cmd: 'catalog.v2.property.getByCode' })
  getByCode(@Payload() dto: PropertyCodeDto) { return this.propertyService.getByCode(dto.code); }

  @MessagePattern({ cmd: 'catalog.v2.property.create' })
  create(@Payload() dto: CreatePropertyDto) {
    return this.propertyService.create(new CreatePropertyCommand(
      dto.code,
      dto.name,
      dto.kind,
      dto.description,
      dto.unitCode,
      dto.options?.map((option) => this.mapOption(option)),
    ));
  }

  @MessagePattern({ cmd: 'catalog.v2.property.update' })
  update(@Payload() dto: UpdatePropertyDto) {
    return this.propertyService.update(new UpdatePropertyCommand(dto.code, dto.version, dto.name, dto.description));
  }

  @MessagePattern({ cmd: 'catalog.v2.property.option.create' })
  createOption(@Payload() dto: CreatePropertyOptionDto) {
    return this.propertyService.createOption(dto.code, dto.version, this.mapOption(dto.option));
  }

  @MessagePattern({ cmd: 'catalog.v2.property.option.update' })
  updateOption(@Payload() dto: UpdatePropertyOptionDto) {
    return this.propertyService.updateOption(new UpdatePropertyOptionCommand(
      dto.code,
      dto.optionCode,
      dto.version,
      dto.name,
      dto.sortOrder,
      dto.extras?.map((extra) => this.mapExtra(extra)),
    ));
  }

  private mapOption(option: PropertyOptionDto): PropertyOptionCommand {
    return new PropertyOptionCommand(
      option.code,
      option.name,
      option.sortOrder,
      option.extras?.map((extra) => this.mapExtra(extra)),
    );
  }

  private mapExtra(extra: PropertyOptionExtraDto): PropertyOptionExtraCommand {
    return new PropertyOptionExtraCommand(
      extra.type,
      extra.sortOrder,
      extra.textDisplay,
      extra.valueText,
      extra.valueColor,
      extra.imageUuid,
    );
  }
}
