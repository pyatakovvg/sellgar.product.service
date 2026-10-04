import { IsNumber, IsUUID } from 'class-validator';

import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends CreateProductDto {
  @IsUUID()
  uuid: string;

  @IsNumber()
  version: number;
}
