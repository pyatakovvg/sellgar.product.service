import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { ProductService } from '../service/product.service';
import { ChangeProductStatusDto } from './dto/change-product-status.dto';
import { ChangeVariantStatusDto } from './dto/change-variant-status.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { GetAllProductsDto } from './dto/get-all-products.dto';
import { ProductUuidDto } from './dto/product-uuid.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { ProductCommandMapper } from './mapper/product-command.mapper';

@Controller()
export class ProductController {
  constructor(
    private readonly service: ProductService,
    private readonly commandMapper: ProductCommandMapper,
  ) {}

  @MessagePattern({ cmd: 'catalog.v2.product.getAll' })
  async getAll(@Payload() dto: GetAllProductsDto) {
    const filters = await this.commandMapper.toFilterCommands(dto.filters ?? []);
    return this.service.getAll(dto.limit, dto.offset, dto.status, dto.typeUuid, filters, dto.term);
  }

  @MessagePattern({ cmd: 'catalog.v2.product.getByUuid' })
  getByUuid(@Payload() dto: ProductUuidDto) {
    return this.service.getByUuid(dto.uuid);
  }

  @MessagePattern({ cmd: 'catalog.v2.product.create' })
  async create(@Payload() dto: CreateProductDto) {
    return this.service.create(await this.commandMapper.toCreateCommand(dto));
  }

  @MessagePattern({ cmd: 'catalog.v2.product.update' })
  async update(@Payload() dto: UpdateProductDto) {
    return this.service.update(await this.commandMapper.toUpdateCommand(dto));
  }

  @MessagePattern({ cmd: 'catalog.v2.product.archive' })
  archive(@Payload() dto: ChangeProductStatusDto) {
    return this.service.archive(dto.uuid, dto.version);
  }

  @MessagePattern({ cmd: 'catalog.v2.product.restore' })
  restore(@Payload() dto: ChangeProductStatusDto) {
    return this.service.restore(dto.uuid, dto.version);
  }

  @MessagePattern({ cmd: 'catalog.v2.product.variant.create' })
  async createVariant(@Payload() dto: CreateVariantDto) {
    return this.service.createVariant(await this.commandMapper.toCreateVariantCommand(dto));
  }

  @MessagePattern({ cmd: 'catalog.v2.product.variant.update' })
  async updateVariant(@Payload() dto: UpdateVariantDto) {
    return this.service.updateVariant(await this.commandMapper.toUpdateVariantCommand(dto));
  }

  @MessagePattern({ cmd: 'catalog.v2.product.variant.archive' })
  archiveVariant(@Payload() dto: ChangeVariantStatusDto) {
    return this.service.archiveVariant(dto.uuid, dto.variantUuid, dto.version);
  }

  @MessagePattern({ cmd: 'catalog.v2.product.variant.restore' })
  restoreVariant(@Payload() dto: ChangeVariantStatusDto) {
    return this.service.restoreVariant(dto.uuid, dto.variantUuid, dto.version);
  }
}
