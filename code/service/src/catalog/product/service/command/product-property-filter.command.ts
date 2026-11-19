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

import { ProductTypeFieldLevel } from '../../../product-type/product-type-field-level.enum';
import { PropertyKind } from '../../../property/property-kind.enum';

export class ProductPropertyFilterCommand {
  @IsEnum(ProductTypeFieldLevel)
  readonly level: ProductTypeFieldLevel;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly propertyCode: string;

  @IsOptional()
  @IsEnum(PropertyKind)
  readonly propertyKind?: PropertyKind;

  @IsOptional()
  @IsString()
  @MaxLength(65535)
  readonly text?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/)
  readonly integerFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/)
  readonly integerTo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  readonly decimalFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  readonly decimalTo?: string;

  @IsOptional()
  @IsBoolean()
  readonly boolean?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  readonly dateFrom?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  readonly dateTo?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(256, { each: true })
  readonly optionCodes?: string[];
}
