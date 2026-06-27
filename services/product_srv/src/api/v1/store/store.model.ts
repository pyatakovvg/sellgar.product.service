import {
  Entity,
  PrimaryColumn,
  Column,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

import { ShopModel } from '../shop/shop.model';
import { PriceModel } from '../price/price.model';
import { VariantModel } from '../variant/variant.model';

@Entity('store')
export class StoreModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column()
  article: string;

  @Column({ name: 'shop_uuid', type: 'uuid' })
  shopUuid: string;

  @JoinColumn({ name: 'shop_uuid' })
  @ManyToOne(() => ShopModel, (shop) => shop.uuid)
  shop: ShopModel;

  @Column({ name: 'variant_uuid', type: 'uuid' })
  variantUuid: string;

  @JoinColumn({ name: 'variant_uuid' })
  @ManyToOne(() => VariantModel, (variant) => variant.uuid)
  variant: VariantModel;

  @Column({ name: 'count', type: 'int', default: 0 })
  count: number;

  @Column({ name: 'showing', type: 'boolean', default: true })
  showing: boolean;

  @OneToMany(() => PriceModel, (price) => price.store)
  prices: PriceModel[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    comment: 'дата создания',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: string;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    comment: 'дата обновления',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: string;
}
