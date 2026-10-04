import { Transform } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { ProductCodeDto } from './product-code.dto';

export class ChangeVariantStatusDto extends ProductCodeDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  variantCode: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  version: number;
}
