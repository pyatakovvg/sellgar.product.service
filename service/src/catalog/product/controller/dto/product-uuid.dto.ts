import { IsUUID } from 'class-validator';

export class ProductUuidDto {
  @IsUUID()
  uuid: string;
}
