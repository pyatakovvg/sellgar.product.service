import { IsInt, IsUUID, Max, Min } from 'class-validator';

import { ProductUuidDto } from './product-uuid.dto';

export class ChangeVariantStatusDto extends ProductUuidDto {
  @IsUUID()
  variantUuid: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  version: number;
}
