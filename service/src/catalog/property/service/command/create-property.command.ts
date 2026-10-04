import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { PropertyKind } from '../../property-kind.enum';
import { PropertyOptionCommand } from './property-option.command';

export class CreatePropertyCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name: string;

  @IsEnum(PropertyKind)
  readonly kind: PropertyKind;

  @IsOptional()
  @IsString()
  readonly description?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly unitCode?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyOptionCommand)
  readonly options?: PropertyOptionCommand[];
}
