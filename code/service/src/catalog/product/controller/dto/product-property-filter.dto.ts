import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { ProductTypeFieldLevel } from '../../../product-type/product-type-field-level.enum';

export class ProductPropertyFilterDto {
  @IsEnum(ProductTypeFieldLevel)
  level: ProductTypeFieldLevel;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  propertyCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(65535)
  text?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/)
  integerFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/)
  integerTo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  decimalFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  decimalTo?: string;

  @IsOptional()
  @IsBoolean()
  boolean?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(256, { each: true })
  optionCodes?: string[];
}
