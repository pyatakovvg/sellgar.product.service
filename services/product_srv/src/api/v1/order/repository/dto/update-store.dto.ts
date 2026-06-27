import { Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

import { CreateStoreDto } from './create-store.dto';

export class UpdateStoreDto extends CreateStoreDto {
  @IsUUID()
  @Expose()
  uuid: string;
}
