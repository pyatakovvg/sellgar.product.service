import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { BrandCodeDto } from './brand-code.dto';
import { BrandImageDto } from './brand-image.dto';

export class CreateBrandDto extends BrandCodeDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  name: string;

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
