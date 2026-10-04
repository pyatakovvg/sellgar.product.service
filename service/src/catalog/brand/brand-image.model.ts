import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ImageModel } from '../image/infrastructure/persistence/model/image.model';
import { BrandModel } from './brand.model';

@Entity('brand_image')
@Check('brand_image_sort_order_nonnegative', 'sort_order >= 0')
export class BrandImageModel {
  @PrimaryColumn({ name: 'brand_code', type: 'varchar', length: 256 })
  brandCode: string;

  @PrimaryColumn({ name: 'image_uuid', type: 'uuid' })
  imageUuid: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @ManyToOne(() => BrandModel, (brand) => brand.images, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'brand_code', referencedColumnName: 'code', foreignKeyConstraintName: 'brand_image_brand_fk' })
  brand: BrandModel;

  @ManyToOne(() => ImageModel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'image_uuid', referencedColumnName: 'uuid', foreignKeyConstraintName: 'brand_image_image_fk' })
  image: ImageModel;
}
