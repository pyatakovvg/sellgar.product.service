import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { BrandCodeDto } from './brand-code.dto';
import { BrandImageDto } from './brand-image.dto';

export class UpdateBrandDto extends BrandCodeDto {
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
  @IsString()
  description?: string | null;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayUnique((image: BrandImageDto) => image.imageUuid.toLowerCase())
  @ValidateNested({ each: true })
  @Type(() => BrandImageDto)
  images?: BrandImageDto[];
}
