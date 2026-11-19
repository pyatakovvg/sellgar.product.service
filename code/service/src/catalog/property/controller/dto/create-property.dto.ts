import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { PropertyKind } from '../../property-kind.enum';
import { PropertyCodeDto } from './property-code.dto';
import { PropertyOptionDto } from './property-option.dto';

export class CreatePropertyDto extends PropertyCodeDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(PropertyKind)
  kind: PropertyKind;

  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  unitCode?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyOptionDto)
  options?: PropertyOptionDto[];
}
