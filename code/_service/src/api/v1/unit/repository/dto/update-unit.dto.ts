import { IsNumber, IsUUID } from 'class-validator';

import { CreateUnitDto } from './create-unit.dto';

export class UpdateUnitDto extends CreateUnitDto {
  @IsUUID()
  uuid: string;

  @IsNumber()
  version: number;
}
