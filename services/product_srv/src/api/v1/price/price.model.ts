import { Entity, PrimaryColumn, Column, JoinColumn, CreateDateColumn, ManyToOne } from 'typeorm';

import { StoreModel } from '../store/store.model';
import { CurrencyModel } from '../currency/currency.model';

@Entity('price')
export class PriceModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'store_uuid' })
  storeUuid: string;

  @JoinColumn({ name: 'store_uuid' })
  @ManyToOne(() => StoreModel, (store) => store.prices, { cascade: true, onDelete: 'CASCADE' })
  store: StoreModel;

  @Column({ name: 'value', type: 'decimal', precision: 10, scale: 2, default: 0 })
  value: number;

  @Column({ name: 'currency_code', type: 'varchar', length: 3 })
  currencyCode: string;

  @JoinColumn({ name: 'currency_code' })
  @ManyToOne(() => CurrencyModel, (currency) => currency.code)
  currency: CurrencyModel;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    comment: 'дата создания',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: string;
}
