import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('image')
@Check('image_version_positive', 'version > 0')
export class ImageModel {
  @PrimaryColumn('uuid', { name: 'uuid' })
  uuid: string;

  @Column({ name: 'file_name', type: 'varchar', length: 256 })
  fileName: string;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;
}
