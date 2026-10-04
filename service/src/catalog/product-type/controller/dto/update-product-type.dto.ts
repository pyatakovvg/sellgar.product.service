import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { ProductTypeFieldDto } from './product-type-field.dto';
import { ProductTypeUuidDto } from './product-type-uuid.dto';

export class UpdateProductTypeDto extends ProductTypeUuidDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  version: number;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTypeFieldDto)
  productFields?: ProductTypeFieldDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductTypeFieldDto)
  variantFields?: ProductTypeFieldDto[];
}
