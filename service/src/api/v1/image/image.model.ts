import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { VariantImageModel } from '../variant/variant-image.model';

@Entity('image')
export class ImageModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'file_name', type: 'varchar', length: 256 })
  fileName: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @OneToMany(() => VariantImageModel, (variantImage) => variantImage.image)
  variants: VariantImageModel[];
}
