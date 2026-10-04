import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

import { ProductTypeFieldCommand } from './product-type-field.command';

export class UpdateProductTypeCommand {
  @IsUUID()
  readonly uuid: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly version: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name?: string;

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
