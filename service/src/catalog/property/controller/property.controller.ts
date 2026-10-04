import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { PropertyService } from '../service/property.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { CreatePropertyOptionDto } from './dto/create-property-option.dto';
import { GetAllPropertiesDto } from './dto/get-all-properties.dto';
import { PropertyCodeDto } from './dto/property-code.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { UpdatePropertyOptionDto } from './dto/update-property-option.dto';
import { PropertyCommandMapper } from './mapper/property-command.mapper';

@Controller()
export class PropertyController {
  constructor(
    private readonly propertyService: PropertyService,
    private readonly commandMapper: PropertyCommandMapper,
  ) {}

  @MessagePattern({ cmd: 'catalog.v2.property.getAll' })
  getAll(@Payload() dto: GetAllPropertiesDto) {
    return this.propertyService.getAll(dto.limit, dto.offset);
  }

  @MessagePattern({ cmd: 'catalog.v2.property.getByCode' })
  getByCode(@Payload() dto: PropertyCodeDto) {
    return this.propertyService.getByCode(dto.code);
  }

  @MessagePattern({ cmd: 'catalog.v2.property.create' })
  async create(@Payload() dto: CreatePropertyDto) {
    return this.propertyService.create(await this.commandMapper.toCreateCommand(dto));
  }

  @MessagePattern({ cmd: 'catalog.v2.property.update' })
  async update(@Payload() dto: UpdatePropertyDto) {
    return this.propertyService.update(await this.commandMapper.toUpdateCommand(dto));
  }

  @MessagePattern({ cmd: 'catalog.v2.property.option.create' })
  async createOption(@Payload() dto: CreatePropertyOptionDto) {
    return this.propertyService.createOption(await this.commandMapper.toCreateOptionCommand(dto));
  }

  @MessagePattern({ cmd: 'catalog.v2.property.option.update' })
  async updateOption(@Payload() dto: UpdatePropertyOptionDto) {
    return this.propertyService.updateOption(await this.commandMapper.toUpdateOptionCommand(dto));
  }
}
