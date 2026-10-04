import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { BrandService } from '../service/brand.service';
import { BrandCodeDto } from './dto/brand-code.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { GetAllBrandsDto } from './dto/get-all-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandCommandMapper } from './mapper/brand-command.mapper';

@Controller()
export class BrandController {
  constructor(
    private readonly service: BrandService,
    private readonly commandMapper: BrandCommandMapper,
  ) {}

  @MessagePattern({ cmd: 'catalog.v2.brand.getAll' })
  getAll(@Payload() dto: GetAllBrandsDto) {
    return this.service.getAll(dto.limit, dto.offset);
  }

  @MessagePattern({ cmd: 'catalog.v2.brand.getByCode' })
  getByCode(@Payload() dto: BrandCodeDto) {
    return this.service.getByCode(dto.code);
  }

  @MessagePattern({ cmd: 'catalog.v2.brand.create' })
  async create(@Payload() dto: CreateBrandDto) {
    return this.service.create(await this.commandMapper.toCreateCommand(dto));
  }

  @MessagePattern({ cmd: 'catalog.v2.brand.update' })
  async update(@Payload() dto: UpdateBrandDto) {
    return this.service.update(await this.commandMapper.toUpdateCommand(dto));
  }
}
