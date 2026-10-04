import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';

import { ImageModel } from '../image/image.model';

import { BrandModel } from './brand.model';

@Entity('brand_image')
@Unique(['brandUuid', 'imageUuid'])
export class BrandImageModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'brand_uuid', type: 'uuid' })
  brandUuid: string;

  @Column({ name: 'image_uuid', type: 'uuid' })
  imageUuid: string;

  @JoinColumn({ name: 'brand_uuid' })
  @ManyToOne(() => BrandModel, (brand) => brand.images, {
    onDelete: 'CASCADE',
  })
  brand: BrandModel;

  @JoinColumn({ name: 'image_uuid' })
  @ManyToOne(() => ImageModel, (image) => image.brands, {
    onDelete: 'CASCADE',
  })
  image: ImageModel;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_primary', type: 'boolean', default: true })
  isPrimary: boolean;

  @Column({ name: 'alt', type: 'varchar', length: 256, nullable: true })
  alt?: string | null;
}
