import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreateProductCommand } from '../service/command/create-product.command';
import { PropertyAssignmentCommand } from '../service/command/property-assignment.command';
import { ProductPropertyFilterCommand } from '../service/command/product-property-filter.command';
import { PropertyValueCommand } from '../service/command/property-value.command';
import { UpdateProductCommand } from '../service/command/update-product.command';
import { UpdateVariantCommand } from '../service/command/update-variant.command';
import { VariantImageCommand } from '../service/command/variant-image.command';
import { VariantInputCommand } from '../service/command/variant-input.command';
import { ProductService } from '../service/product.service';
import { ChangeProductStatusDto } from './dto/change-product-status.dto';
import { ChangeVariantStatusDto } from './dto/change-variant-status.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { GetAllProductsDto } from './dto/get-all-products.dto';
import { ProductCodeDto } from './dto/product-code.dto';
import { ProductPropertyFilterDto } from './dto/product-property-filter.dto';
import { PropertyAssignmentDto } from './dto/property-assignment.dto';
import { PropertyValueDto } from './dto/property-value.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { VariantImageDto } from './dto/variant-image.dto';
import { VariantInputDto } from './dto/variant-input.dto';

@Controller()
export class ProductController {
  constructor(private readonly service: ProductService) {}

  @MessagePattern({ cmd: 'catalog.v2.product.getAll' })
  getAll(@Payload() dto: GetAllProductsDto) {
    return this.service.getAll(dto.limit, dto.offset, dto.status, dto.typeUuid, this.mapFilters(dto.filters ?? []));
  }

  @MessagePattern({ cmd: 'catalog.v2.product.getByCode' })
  getByCode(@Payload() dto: ProductCodeDto) { return this.service.getByCode(dto.code); }

  @MessagePattern({ cmd: 'catalog.v2.product.create' })
  create(@Payload() dto: CreateProductDto) {
    return this.service.create(new CreateProductCommand(
      dto.code,
      dto.typeUuid,
      dto.typeVersion,
      dto.name,
      dto.brandCode,
      dto.description ?? null,
      this.mapAssignments(dto.properties ?? []),
      dto.variants.map((variant) => this.mapVariant(variant)),
    ));
  }

  @MessagePattern({ cmd: 'catalog.v2.product.update' })
  update(@Payload() dto: UpdateProductDto) {
    return this.service.update(new UpdateProductCommand(
      dto.code,
      dto.version,
      dto.typeVersion,
      dto.name,
      dto.description,
      dto.brandCode,
      dto.properties === undefined ? undefined : this.mapAssignments(dto.properties),
    ));
  }

  @MessagePattern({ cmd: 'catalog.v2.product.archive' })
  archive(@Payload() dto: ChangeProductStatusDto) { return this.service.archive(dto.code, dto.version); }

  @MessagePattern({ cmd: 'catalog.v2.product.restore' })
  restore(@Payload() dto: ChangeProductStatusDto) { return this.service.restore(dto.code, dto.version); }

  @MessagePattern({ cmd: 'catalog.v2.product.variant.create' })
  createVariant(@Payload() dto: CreateVariantDto) {
    return this.service.createVariant(dto.code, dto.version, dto.typeVersion, this.mapVariant(dto.variant));
  }

  @MessagePattern({ cmd: 'catalog.v2.product.variant.update' })
  updateVariant(@Payload() dto: UpdateVariantDto) {
    return this.service.updateVariant(new UpdateVariantCommand(
      dto.code,
      dto.variantCode,
      dto.version,
      dto.typeVersion,
      dto.name,
      dto.description,
      dto.properties === undefined ? undefined : this.mapAssignments(dto.properties),
      dto.images === undefined ? undefined : this.mapImages(dto.images),
    ));
  }

  @MessagePattern({ cmd: 'catalog.v2.product.variant.archive' })
  archiveVariant(@Payload() dto: ChangeVariantStatusDto) {
    return this.service.archiveVariant(dto.code, dto.variantCode, dto.version);
  }

  @MessagePattern({ cmd: 'catalog.v2.product.variant.restore' })
  restoreVariant(@Payload() dto: ChangeVariantStatusDto) {
    return this.service.restoreVariant(dto.code, dto.variantCode, dto.version);
  }

  private mapVariant(variant: VariantInputDto): VariantInputCommand {
    return new VariantInputCommand(
      variant.code,
      variant.name,
      variant.description,
      this.mapAssignments(variant.properties ?? []),
      this.mapImages(variant.images ?? []),
    );
  }

  private mapAssignments(assignments: PropertyAssignmentDto[]): PropertyAssignmentCommand[] {
    return assignments.map((assignment) => new PropertyAssignmentCommand(
      assignment.propertyCode,
      assignment.values.map((value) => this.mapValue(value)),
    ));
  }

  private mapValue(value: PropertyValueDto): PropertyValueCommand {
    return new PropertyValueCommand(
      value.valueText,
      value.valueInteger,
      value.valueDecimal,
      value.valueBoolean,
      value.valueDate,
      value.valueOptionCode,
    );
  }

  private mapImages(images: VariantImageDto[]): VariantImageCommand[] {
    return images.map((image) => new VariantImageCommand(image.imageUuid, image.sortOrder));
  }

  private mapFilters(filters: ProductPropertyFilterDto[]): ProductPropertyFilterCommand[] {
    return filters.map((filter) => new ProductPropertyFilterCommand(
      filter.level,
      filter.propertyCode,
      undefined,
      filter.text,
      filter.integerFrom,
      filter.integerTo,
      filter.decimalFrom,
      filter.decimalTo,
      filter.boolean,
      filter.dateFrom,
      filter.dateTo,
      filter.optionCodes,
    ));
  }
}
