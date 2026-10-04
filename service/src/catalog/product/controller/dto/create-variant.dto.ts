import { Type } from 'class-transformer';
import { IsInt, Max, Min, ValidateNested } from 'class-validator';

import { ProductCodeDto } from './product-code.dto';
import { VariantInputDto } from './variant-input.dto';

export class CreateVariantDto extends ProductCodeDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  version: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  typeVersion: number;

  @ValidateNested()
  @Type(() => VariantInputDto)
  variant: VariantInputDto;
}
