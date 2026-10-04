import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';

export class ProductCodeDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  code: string;
}
