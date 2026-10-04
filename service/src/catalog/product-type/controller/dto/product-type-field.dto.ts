import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';

export class ProductTypeFieldDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  propertyCode: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;
}
