import { BadRequestException, Injectable } from '@nestjs/common';

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
    return ProductTypeEntity.fromModel(
      await this.repository.create(new CreateProductTypeCommand(command.name, productFields, variantFields)),
    );
  }

  async update(command: UpdateProductTypeCommand): Promise<ProductTypeEntity> {
    const normalized = new UpdateProductTypeCommand(
      command.uuid,
      command.version,
      command.name,
      command.productFields === undefined ? undefined : this.normalizeFields(command.productFields),
      command.variantFields === undefined ? undefined : this.normalizeFields(command.variantFields),
    );
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
    return new ProductTypeFieldCommand(
      field.propertyCode,
      field.required ?? false,
      field.multiple ?? false,
      field.sortOrder ?? defaultOrder,
    );
  }
}
