import { Entity, Unique, Column, PrimaryColumn, JoinColumn, ManyToOne } from 'typeorm';

import { VariantModel } from './variant.model';
import { ImageModel } from '../image/image.model';
import { PropertyModel } from '../property/property.model';

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
  @ManyToOne(() => VariantModel, (variant) => variant.properties, {
    onDelete: 'CASCADE',
  })
  variant: VariantModel;

  @JoinColumn({ name: 'image_uuid' })
  @ManyToOne(() => PropertyModel, (property) => property.variants, {
    onDelete: 'CASCADE',
  })
  image: ImageModel;

  @Column({ name: 'order', type: 'int', default: 0 })
  order: number;
}
