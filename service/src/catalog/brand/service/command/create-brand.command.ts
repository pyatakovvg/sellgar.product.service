import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { BrandImageCommand } from './brand-image.command';

export class CreateBrandCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name: string;

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
