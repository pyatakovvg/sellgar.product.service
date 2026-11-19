import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

import { PropertyOptionExtraCommand } from './property-option-extra.command';

export class PropertyOptionCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  readonly sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyOptionExtraCommand)
  readonly extras?: PropertyOptionExtraCommand[];
}
