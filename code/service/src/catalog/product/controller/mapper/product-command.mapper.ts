import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { CreateProductCommand } from '../../service/command/create-product.command';
import { CreateVariantCommand } from '../../service/command/create-variant.command';
import { ProductPropertyFilterCommand } from '../../service/command/product-property-filter.command';
import { UpdateProductCommand } from '../../service/command/update-product.command';
import { UpdateVariantCommand } from '../../service/command/update-variant.command';
import { CreateProductDto } from '../dto/create-product.dto';
import { CreateVariantDto } from '../dto/create-variant.dto';
import { ProductPropertyFilterDto } from '../dto/product-property-filter.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { UpdateVariantDto } from '../dto/update-variant.dto';

@Injectable()
export class ProductCommandMapper {
  toCreateCommand(dto: CreateProductDto): Promise<CreateProductCommand> {
    return this.transform(CreateProductCommand, {
      ...dto,
      description: dto.description ?? null,
      properties: dto.properties ?? [],
    });
  }

  toUpdateCommand(dto: UpdateProductDto): Promise<UpdateProductCommand> {
    return this.transform(UpdateProductCommand, dto);
  }

  toCreateVariantCommand(dto: CreateVariantDto): Promise<CreateVariantCommand> {
    const { uuid, ...input } = dto;
    return this.transform(CreateVariantCommand, { ...input, productUuid: uuid });
  }

  toUpdateVariantCommand(dto: UpdateVariantDto): Promise<UpdateVariantCommand> {
    const { uuid, ...input } = dto;
    return this.transform(UpdateVariantCommand, { ...input, productUuid: uuid });
  }

  async toFilterCommands(filters: ProductPropertyFilterDto[]): Promise<ProductPropertyFilterCommand[]> {
    return Promise.all(filters.map((filter) => this.transform(ProductPropertyFilterCommand, filter)));
  }

  private async transform<T extends object>(type: new () => T, source: object): Promise<T> {
    const command = plainToInstance(type, source);
    await validateOrReject(command, { whitelist: true, forbidNonWhitelisted: true });
    return command;
  }
}
