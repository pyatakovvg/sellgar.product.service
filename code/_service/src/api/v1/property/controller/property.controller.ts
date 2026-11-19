import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreatePropertyDto } from '../repository/dto/create-property.dto';
import { UpdatePropertyDto } from '../repository/dto/update-property.dto';

import { PropertyService } from '../service/property.service';

@Controller('properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @MessagePattern({ cmd: 'property.findAll' })
  findAll() {
    return this.propertyService.findAll();
  }

  @MessagePattern({ cmd: 'property.findByUuid' })
  findByUuid(@Payload('uuid') uuid: string) {
    return this.propertyService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'property.create' })
  create(@Payload() dto: CreatePropertyDto) {
    return this.propertyService.create(dto);
  }

  @MessagePattern({ cmd: 'property.update' })
  update(@Payload() dto: UpdatePropertyDto) {
    return this.propertyService.update(dto);
  }
}
