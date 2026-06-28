import { IsNumber, IsUUID } from 'class-validator';

import { CreatePropertyGroupDto } from './create-property-group.dto';

export class UpdatePropertyGroupDto extends CreatePropertyGroupDto {
  @IsUUID()
  uuid: string;

  @IsNumber()
  version: number;
}
