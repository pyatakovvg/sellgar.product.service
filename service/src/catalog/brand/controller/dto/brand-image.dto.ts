import { Transform } from 'class-transformer';
import { IsInt, IsUUID, Max, Min, ValidateIf } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';

export class BrandImageDto {
  @Transform(trimString)
  @IsUUID()
  imageUuid: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;
}
