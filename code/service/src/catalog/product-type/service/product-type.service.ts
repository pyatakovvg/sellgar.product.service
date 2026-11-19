import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { ProductTypeEntity } from '../entity/product-type.entity';
import { ProductTypePageEntity } from '../entity/product-type-page.entity';
import { ProductTypeRepository } from '../repository/product-type.repository';
import { CreateProductTypeCommand } from './command/create-product-type.command';
import { ProductTypeFieldCommand } from './command/product-type-field.command';
import { UpdateProductTypeCommand } from './command/update-product-type.command';

@Injectable()
export class ProductTypeService {
  constructor(private readonly repository: ProductTypeRepository) {}

  async getAll(limit: number, offset: number): Promise<ProductTypePageEntity> {
    const page = await this.repository.getAll(limit, offset);
    return { ...page, items: page.items.map(ProductTypeEntity.fromModel) };
  }

  async getByUuid(uuid: string): Promise<ProductTypeEntity> {
    return ProductTypeEntity.fromModel(await this.repository.getByUuid(uuid));
  }

  async create(command: CreateProductTypeCommand): Promise<ProductTypeEntity> {
    const productFields = this.normalizeFields(command.productFields ?? []);
    const variantFields = this.normalizeFields(command.variantFields ?? []);
    const normalized = plainToInstance(CreateProductTypeCommand, {
      name: command.name,
      productFields,
      variantFields,
    });

    await validateOrReject(normalized, { whitelist: true, forbidNonWhitelisted: true });

    return ProductTypeEntity.fromModel(await this.repository.create(normalized));
  }

  async update(command: UpdateProductTypeCommand): Promise<ProductTypeEntity> {
    const normalized = plainToInstance(UpdateProductTypeCommand, {
      uuid: command.uuid,
      version: command.version,
      name: command.name,
      productFields: command.productFields === undefined ? undefined : this.normalizeFields(command.productFields),
      variantFields: command.variantFields === undefined ? undefined : this.normalizeFields(command.variantFields),
    });

    await validateOrReject(normalized, { whitelist: true, forbidNonWhitelisted: true });

    return ProductTypeEntity.fromModel(await this.repository.update(normalized));
  }

  private normalizeFields(fields: ProductTypeFieldCommand[]): ProductTypeFieldCommand[] {
    const codes = new Set<string>();
    return fields.map((field, index) => {
      if (codes.has(field.propertyCode)) {
        throw new BadRequestException(`Duplicate product type field ${field.propertyCode}`);
      }
      codes.add(field.propertyCode);
      return this.normalizeField(field, index);
    });
  }

  private normalizeField(field: ProductTypeFieldCommand, defaultOrder: number): ProductTypeFieldCommand {
    return plainToInstance(ProductTypeFieldCommand, {
      propertyCode: field.propertyCode,
      required: field.required ?? false,
      multiple: field.multiple ?? false,
      sortOrder: field.sortOrder ?? defaultOrder,
    });
  }
}
