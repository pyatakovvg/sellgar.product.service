import { Entity, PrimaryColumn, JoinColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';

import { CategoryModel } from './category.model';

@Entity('category_closure')
export class CategoryClosureModel {
  @PrimaryColumn({ name: 'ancestor_id', type: 'uuid' })
  ancestorId: string;

  @PrimaryColumn({ name: 'descendant_id', type: 'uuid' })
  descendantId: string;

  @ManyToOne(() => CategoryModel, (category) => category.ancestors)
  @JoinColumn({ name: 'ancestor_id' })
  ancestor: CategoryModel;

  @ManyToOne(() => CategoryModel, (category) => category.descendants)
  @JoinColumn({ name: 'descendant_id' })
  descendant: CategoryModel;

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
  updatedAt: Date;
}
