import { IsUUID } from 'class-validator';

export class ProductTypeUuidDto {
  @IsUUID()
  uuid: string;
}
