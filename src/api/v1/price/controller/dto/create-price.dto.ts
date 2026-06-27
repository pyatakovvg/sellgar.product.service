import { IsUUID, IsNumber, IsString } from 'class-validator';

export class CreatePriceDto {
  @IsUUID()
  uuid: string;

  @IsNumber()
  value: number;

  @IsString()
  currencyCode: string;
}
