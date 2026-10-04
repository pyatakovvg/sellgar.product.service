import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { ProductTypeFieldCommand } from './product-type-field.command';

export class CreateProductTypeCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTypeFieldCommand)
  readonly productFields?: ProductTypeFieldCommand[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTypeFieldCommand)
  readonly variantFields?: ProductTypeFieldCommand[];
}
