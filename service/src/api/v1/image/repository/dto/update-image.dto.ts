import { IsNumber } from 'class-validator';

import { CreateImageDto } from './create-image.dto';

export class UpdateImageDto extends CreateImageDto {
  @IsNumber()
  version: number;
}
