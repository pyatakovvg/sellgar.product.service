import { Check, Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { BrandImageModel } from './brand-image.model';

@Entity('brand')
@Check('brand_version_positive', 'version > 0')
export class BrandModel {
  @PrimaryColumn({ type: 'varchar', length: 256 })
  code: string;

  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @OneToMany(() => BrandImageModel, (link) => link.brand)
  images: BrandImageModel[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
