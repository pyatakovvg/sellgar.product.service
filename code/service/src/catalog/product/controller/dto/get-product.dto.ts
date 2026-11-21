import { IsBoolean, IsOptional } from 'class-validator';

import { ProductUuidDto } from './product-uuid.dto';

export class GetProductDto extends ProductUuidDto {
  @IsOptional()
  @IsBoolean()
  withEmptyProperties?: boolean;
}
