import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreateUnitDto } from '../repository/dto/create-unit.dto';
import { UpdateUnitDto } from '../repository/dto/update-unit.dto';

import { UnitService } from '../service/unit.service';

@Controller()
export class UnitController {
  constructor(private readonly unitService: UnitService) {}

  @MessagePattern({ cmd: 'unit.findAll' })
  findAll() {
    return this.unitService.findAll();
  }

  @MessagePattern({ cmd: 'unit.findByUuid' })
  findByUuid(@Payload('uuid') uuid: string) {
    return this.unitService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'unit.create' })
  create(@Payload() dto: CreateUnitDto) {
    return this.unitService.create(dto);
  }

  @MessagePattern({ cmd: 'unit.update' })
  update(@Payload() dto: UpdateUnitDto) {
    return this.unitService.update(dto);
  }
}
