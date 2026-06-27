import { IsNumber, IsString } from 'class-validator';

export class CreatePriceDto {
  @IsNumber()
  value: number;

  @IsString()
  currencyCode: string;
}
