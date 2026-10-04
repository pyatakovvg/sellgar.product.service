import { PropertyEntity } from '../../property/entity/property.entity';
import { TypeProductFieldModel } from '../../product-type/type-product-field.model';
import { TypeVariantFieldModel } from '../../product-type/type-variant-field.model';
import { ProductPropertyModel } from '../product-property.model';
import { VariantPropertyModel } from '../variant-property.model';
import { PropertyValueEntity } from './property-value.entity';

export class ProductFieldEntity {
  propertyCode: string;
  required: boolean;
  multiple: boolean;
  sortOrder: number;
  property: PropertyEntity;
  values: PropertyValueEntity[];

  static fromModels(
    field: TypeProductFieldModel | TypeVariantFieldModel,
    assignment?: ProductPropertyModel | VariantPropertyModel,
  ): ProductFieldEntity {
    return {
      propertyCode: field.propertyCode,
      required: field.required,
      multiple: field.multiple,
      sortOrder: field.sortOrder,
      property: PropertyEntity.fromModel(field.property),
      values: (assignment?.values ?? []).map(PropertyValueEntity.fromModel),
    };
  }
}
