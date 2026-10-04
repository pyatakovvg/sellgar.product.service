import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { ImageModel } from '../image/infrastructure/persistence/model/image.model';
import { VariantModel } from './variant.model';

@Entity('variant_image')
@Check('variant_image_sort_order_nonnegative', 'sort_order >= 0')
export class VariantImageModel {
  @PrimaryColumn({ name: 'variant_code', type: 'varchar', length: 256 })
  variantCode: string;

  @PrimaryColumn({ name: 'image_uuid', type: 'uuid' })
  imageUuid: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @ManyToOne(() => VariantModel, (variant) => variant.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_code', referencedColumnName: 'code', foreignKeyConstraintName: 'variant_image_variant_fk' })
  variant: VariantModel;

  @ManyToOne(() => ImageModel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'image_uuid', referencedColumnName: 'uuid', foreignKeyConstraintName: 'variant_image_image_fk' })
  image: ImageModel;
}
