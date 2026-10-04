import { IsInt, Max, Min } from 'class-validator';

import { ProductCodeDto } from './product-code.dto';

export class ChangeProductStatusDto extends ProductCodeDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  version: number;
}
