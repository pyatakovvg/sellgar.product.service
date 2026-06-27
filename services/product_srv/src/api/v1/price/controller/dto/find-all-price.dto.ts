import { IsUUID } from 'class-validator';

export class FindAllPriceDto {
  @IsUUID()
  uuid: string;
}
