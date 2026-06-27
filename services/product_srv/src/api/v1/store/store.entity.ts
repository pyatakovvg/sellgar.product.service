import { Type, Expose } from 'class-transformer';
import { IsUUID, IsDate, ValidateNested, IsNumber, IsString, IsBoolean } from 'class-validator';

import { ShopEntity } from '../shop/shop.entity';
import { PriceEntity } from '../price/price.entity';
import { VariantEntity } from '../variant/variant.entity';

export class StoreEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsString()
  article: string;

  @Expose()
  @IsUUID()
  shopUuid: string;

  @Expose()
  @ValidateNested()
  @Type(() => ShopEntity)
  shop: ShopEntity;

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
  @Type(() => StoreEntity)
  data: StoreEntity[];

  @Expose()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
