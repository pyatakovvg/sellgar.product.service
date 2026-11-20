import { IsUUID } from 'class-validator';

import { ProductUuidDto } from './product-uuid.dto';

export class VariantUuidDto extends ProductUuidDto {
  @IsUUID()
  variantUuid: string;
}
