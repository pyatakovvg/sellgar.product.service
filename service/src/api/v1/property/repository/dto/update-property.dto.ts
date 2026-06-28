import { IsNumber, IsUUID } from 'class-validator';

import { CreatePropertyDto } from './create-property.dto';

export class UpdatePropertyDto extends CreatePropertyDto {
  @IsUUID()
  uuid: string;

  @IsNumber()
  version: number;
}
