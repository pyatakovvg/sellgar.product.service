import { Entity, Unique, Column, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';

import { VariantModel } from './variant.model';
import { ImageModel } from '../image/image.model';

@Entity('variant_image')
@Unique(['variantUuid', 'imageUuid'])
export class VariantImageModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'variant_uuid', type: 'uuid' })
  variantUuid: string;

  @Column({ name: 'image_uuid', type: 'uuid' })
  imageUuid: string;

  @JoinColumn({ name: 'variant_uuid' })
  @ManyToOne(() => VariantModel, (variant) => variant.images, {
    onDelete: 'CASCADE',
  })
  variant: VariantModel;

  @JoinColumn({ name: 'image_uuid' })
  @ManyToOne(() => ImageModel, (image) => image.variants, {
    onDelete: 'CASCADE',
  })
  image: ImageModel;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ name: 'alt', type: 'varchar', length: 256, nullable: true })
  alt?: string | null;
}
