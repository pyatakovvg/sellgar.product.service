import {
  Entity,
  PrimaryColumn,
  Column,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ProductModel } from '../product/product.model';
import { VariantPropertyModel } from './variant-property.model';
import { VariantImageModel } from './variant-image.model';

@Entity('variant')
export class VariantModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Index({ fulltext: true })
  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'product_uuid' })
  productUuid: string;

  @JoinColumn({ name: 'product_uuid' })
  @ManyToOne(() => ProductModel, (product) => product.variants)
  product: ProductModel;

  @OneToMany(() => VariantPropertyModel, (variantProperty) => variantProperty.variant)
  properties: VariantPropertyModel[];

  @OneToMany(() => VariantImageModel, (variantImage) => variantImage.variant)
  images: VariantImageModel[];

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    comment: 'дата создания',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    comment: 'дата обновления',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
