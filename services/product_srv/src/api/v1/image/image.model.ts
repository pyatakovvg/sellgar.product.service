import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('image')
export class ImageModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'file_name', type: 'varchar', length: 256 })
  fileName: string;
}
