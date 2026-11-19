import { IsInt, Max, Min } from 'class-validator';

import { ProductUuidDto } from './product-uuid.dto';

export class ChangeProductStatusDto extends ProductUuidDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  version: number;
}
