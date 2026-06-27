import { Entity, PrimaryColumn, Column, JoinColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';

import { StoreModel } from '../store/store.model';

@Entity('cart')
export class CartItemModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'store_uuid', type: 'uuid' })
  storeUuid: string;

  @JoinColumn({ name: 'store_uuid' })
  @ManyToOne(() => StoreModel, (store) => store.uuid)
  store: StoreModel;

  @Column({ name: 'count', type: 'int', default: 0 })
  count: number;

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
