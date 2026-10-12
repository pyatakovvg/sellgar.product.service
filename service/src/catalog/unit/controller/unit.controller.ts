import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateUnitDto } from './dto/create-unit.dto';
import { GetAllUnitsDto } from './dto/get-all-units.dto';
import { UnitCodeDto } from './dto/unit-code.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitService } from '../service/unit.service';

@Controller()
export class UnitController {
  constructor(private readonly service: UnitService) {}

  @MessagePattern({ cmd: 'catalog.v2.unit.getAll' })
  getAll(@Payload() dto: GetAllUnitsDto) {
    return this.service.getAll(dto.limit, dto.offset);
  }

  @MessagePattern({ cmd: 'catalog.v2.unit.getByCode' })
  getByCode(@Payload() dto: UnitCodeDto) {
    return this.service.getByCode(dto.code);
  }

  @MessagePattern({ cmd: 'catalog.v2.unit.create' })
  create(@Payload() dto: CreateUnitDto) {
    return this.service.create(dto.code, dto.name, dto.symbol, dto.description);
  }

  @MessagePattern({ cmd: 'catalog.v2.unit.update' })
  update(@Payload() dto: UpdateUnitDto) {
    return this.service.update(dto.code, dto.version, dto.name, dto.symbol, dto.description);
  }
}
