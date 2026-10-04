import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ProductTypeService } from '../service/product-type.service';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { GetAllProductTypesDto } from './dto/get-all-product-types.dto';
import { ProductTypeUuidDto } from './dto/product-type-uuid.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductTypeCommandMapper } from './mapper/product-type-command.mapper';

@Controller()
export class ProductTypeController {
  constructor(
    private readonly service: ProductTypeService,
    private readonly commandMapper: ProductTypeCommandMapper,
  ) {}

  @MessagePattern({ cmd: 'catalog.v2.productType.getAll' })
  getAll(@Payload() dto: GetAllProductTypesDto) {
    return this.service.getAll(dto.limit, dto.offset);
  }

  @MessagePattern({ cmd: 'catalog.v2.productType.getByUuid' })
  getByUuid(@Payload() dto: ProductTypeUuidDto) {
    return this.service.getByUuid(dto.uuid);
  }

  @MessagePattern({ cmd: 'catalog.v2.productType.create' })
  async create(@Payload() dto: CreateProductTypeDto) {
    return this.service.create(await this.commandMapper.toCreateCommand(dto));
  }

  @MessagePattern({ cmd: 'catalog.v2.productType.update' })
  async update(@Payload() dto: UpdateProductTypeDto) {
    return this.service.update(await this.commandMapper.toUpdateCommand(dto));
  }
}
