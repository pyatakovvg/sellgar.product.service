import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { BrandImageCommand } from './brand-image.command';

export class UpdateBrandCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly code: string;

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
  @IsString()
  readonly description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique((image: BrandImageCommand) => image.imageUuid.toLowerCase())
  @ValidateNested({ each: true })
  @Type(() => BrandImageCommand)
  readonly images?: BrandImageCommand[];
}
