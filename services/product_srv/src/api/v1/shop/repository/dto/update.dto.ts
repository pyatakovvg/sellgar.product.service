import { Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

import { CreateDto } from './create.dto';

export class UpdateDto extends CreateDto {
  @IsUUID()
  @Expose()
  uuid: string;
}
