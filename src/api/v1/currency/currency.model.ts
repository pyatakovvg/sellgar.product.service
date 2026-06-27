import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('currency')
export class CurrencyModel {
  @PrimaryColumn('varchar', { name: 'code' })
  code: string;

  @Column({ name: 'name', type: 'varchar', length: 256, nullable: false })
  name: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    comment: 'дата создания',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: string;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    comment: 'дата обновления',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: string;
}
