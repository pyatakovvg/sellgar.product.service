import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';

import { ImageModel } from '../image/image.model';

import { CategoryModel } from './category.model';

@Entity('category_image')
@Unique(['categoryUuid', 'imageUuid'])
export class CategoryImageModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'category_uuid', type: 'uuid' })
  categoryUuid: string;

  @Column({ name: 'image_uuid', type: 'uuid' })
  imageUuid: string;

  @JoinColumn({ name: 'category_uuid' })
  @ManyToOne(() => CategoryModel, (category) => category.images, {
    onDelete: 'CASCADE',
  })
  category: CategoryModel;

  @JoinColumn({ name: 'image_uuid' })
  @ManyToOne(() => ImageModel, (image) => image.categories, {
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
