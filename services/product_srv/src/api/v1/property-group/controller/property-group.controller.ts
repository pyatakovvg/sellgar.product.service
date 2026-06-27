import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreatePropertyGroupDto } from '../repository/dto/create-property-group.dto';
import { UpdatePropertyGroupDto } from '../repository/dto/update-property-group.dto';

import { PropertyGroupService } from '../service/property-group.service';

@Controller()
export class PropertyGroupController {
  constructor(private readonly propertyService: PropertyGroupService) {}

  @MessagePattern({ cmd: 'property-group.findAll' })
  findAll() {
    console.log('findAll');
    return this.propertyService.findAll();
  }

  @MessagePattern({ cmd: 'property-group.findByUuid' })
  findByUuid(@Payload('uuid') uuid: string) {
    return this.propertyService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'property-group.create' })
  create(@Payload() dto: CreatePropertyGroupDto) {
    return this.propertyService.create(dto);
  }

  @MessagePattern({ cmd: 'property-group.update' })
  update(@Payload() dto: UpdatePropertyGroupDto) {
    return this.propertyService.update(dto);
  }
}
