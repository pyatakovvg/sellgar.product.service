import { Injectable } from '@nestjs/common';

import { CreateProductTypeCommand } from '../../service/command/create-product-type.command';
import { ProductTypeFieldCommand } from '../../service/command/product-type-field.command';
import { UpdateProductTypeCommand } from '../../service/command/update-product-type.command';
import { CreateProductTypeDto } from '../dto/create-product-type.dto';
import { ProductTypeFieldDto } from '../dto/product-type-field.dto';
import { UpdateProductTypeDto } from '../dto/update-product-type.dto';

@Injectable()
export class ProductTypeCommandMapper {
  toCreateCommand(dto: CreateProductTypeDto): CreateProductTypeCommand {
    return new CreateProductTypeCommand(
      dto.name,
      this.toFieldCommands(dto.productFields),
      this.toFieldCommands(dto.variantFields),
    );
  }

  toUpdateCommand(dto: UpdateProductTypeDto): UpdateProductTypeCommand {
    return new UpdateProductTypeCommand(
      dto.uuid,
      dto.version,
      dto.name,
      this.toFieldCommands(dto.productFields),
      this.toFieldCommands(dto.variantFields),
    );
  }

  private toFieldCommands(fields: ProductTypeFieldDto[] | undefined): ProductTypeFieldCommand[] | undefined {
    return fields?.map((field) => new ProductTypeFieldCommand(
      field.propertyCode,
      field.required,
      field.multiple,
      field.sortOrder,
    ));
  }
}
