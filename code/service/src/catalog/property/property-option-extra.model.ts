import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { ImageModel } from '../image/infrastructure/persistence/model/image.model';
import { PropertyOptionExtraKind } from './property-option-extra-kind.enum';
import { PropertyOptionTextDisplay } from './property-option-text-display.enum';
import { PropertyOptionModel } from './property-option.model';

@Entity('property_option_extra')
@Check('property_option_extra_sort_order_nonnegative', 'sort_order >= 0')
@Check(
  'property_option_extra_value_shape',
  `(type = 'TEXT' AND value_text IS NOT NULL AND text_display IS NOT NULL AND value_color IS NULL AND image_uuid IS NULL)
   OR (type = 'COLOR' AND value_text IS NULL AND text_display IS NULL AND value_color IS NOT NULL AND image_uuid IS NULL)
   OR (type = 'IMAGE' AND value_text IS NULL AND text_display IS NULL AND value_color IS NULL AND image_uuid IS NOT NULL)`,
)
export class PropertyOptionExtraModel {
  @PrimaryColumn({ name: 'property_code', type: 'varchar', length: 256 })
  propertyCode: string;

  @PrimaryColumn({ name: 'option_code', type: 'varchar', length: 256 })
  optionCode: string;

  @PrimaryColumn({ type: 'enum', enum: PropertyOptionExtraKind, enumName: 'property_option_extra_kind_enum' })
  type: PropertyOptionExtraKind;

  @PrimaryColumn({ name: 'sort_order', type: 'integer' })
  sortOrder: number;

  @Column({
    name: 'text_display',
    type: 'enum',
    enum: PropertyOptionTextDisplay,
    enumName: 'property_option_text_display_enum',
    nullable: true,
  })
  textDisplay: PropertyOptionTextDisplay | null;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText: string | null;

  @Column({ name: 'value_color', type: 'varchar', length: 9, nullable: true })
  valueColor: string | null;

  @Column({ name: 'image_uuid', type: 'uuid', nullable: true })
  imageUuid: string | null;

  @ManyToOne(() => PropertyOptionModel, (option) => option.extras, { onDelete: 'CASCADE' })
  @JoinColumn([
    {
      name: 'property_code',
      referencedColumnName: 'propertyCode',
      foreignKeyConstraintName: 'property_option_extra_option_fk',
    },
    { name: 'option_code', referencedColumnName: 'code' },
  ])
  option: PropertyOptionModel;

  @ManyToOne(() => ImageModel, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'image_uuid',
    referencedColumnName: 'uuid',
    foreignKeyConstraintName: 'property_option_extra_image_fk',
  })
  image: ImageModel | null;
}
