import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { UnitCodeDto } from './unit-code.dto';

export class CreateUnitDto extends UnitCodeDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  name: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  symbol: string;
  @IsOptional()
  @IsString()
  description?: string | null;
}
