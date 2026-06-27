import { Type, Expose } from 'class-transformer';
import { IsUUID, IsString, IsNumber, IsBoolean, ValidateNested } from 'class-validator';

class CurrentPrice {
  @Expose()
  @IsNumber()
  value: number;

  @Expose()
  @IsString()
  currencyCode: string;
}

export class CreateStoreDto {
  @Expose()
  @IsString()
  article: string;

  @Expose()
  @IsUUID()
  variantUuid: string;

  @Expose()
  @ValidateNested()
  @Type(() => CurrentPrice)
  currentPrice: CurrentPrice;

  @Expose()
  @IsNumber()
  count: number;

  @Expose()
  @IsBoolean()
  showing: boolean;
}
