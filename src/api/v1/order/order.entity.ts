import { Type, Expose } from 'class-transformer';
import { IsUUID, IsDate, ValidateNested, IsNumber, IsString, IsBoolean } from 'class-validator';

import { PriceEntity } from '../price/price.entity';
import { VariantEntity } from '../variant/variant.entity';

export class OrderEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsString()
  article: string;

  @Expose()
  @IsUUID()
  variantUuid: string;

  @Expose()
  @ValidateNested()
  @Type(() => VariantEntity)
  variant: VariantEntity;

  @Expose()
  @IsNumber()
  count: number;

  @Expose()
  @ValidateNested()
  @Type(() => PriceEntity)
  prices: PriceEntity[];

  @Expose()
  @ValidateNested()
  @Type(() => PriceEntity)
  currentPrice: PriceEntity;

  @Expose()
  @IsBoolean()
  showing: boolean;

  @Expose()
  @IsDate()
  createdAt: Date;

  @Expose()
  @IsDate()
  updatedAt: Date;
}

class MetaEntity {
  @Expose()
  @IsNumber()
  totalRows: number;
}

export class StoreResultEntity {
  @Expose()
  @ValidateNested()
  @Type(() => OrderEntity)
  data: OrderEntity[];

  @Expose()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
