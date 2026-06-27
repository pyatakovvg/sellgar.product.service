import { Type, Expose } from 'class-transformer';
import { IsUUID, ValidateNested, IsNumber, IsDecimal, IsDate } from 'class-validator';

import { CurrencyEntity } from '../currency/currency.entity';

export class PriceEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsDecimal()
  value: number;

  @Expose()
  @ValidateNested()
  @Type(() => CurrencyEntity)
  currency: CurrencyEntity;

  @Expose()
  @IsDate()
  createdAt: string;
}

class MetaEntity {
  @Expose()
  @IsNumber()
  totalRows: number;
}

export class PriceResultEntity {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => PriceEntity)
  data: PriceEntity[];

  @Expose()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
