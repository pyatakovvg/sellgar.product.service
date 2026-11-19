import { PropertyEntity } from '../../property/entity/property.entity';
import { TypeProductFieldModel } from '../type-product-field.model';
import { TypeVariantFieldModel } from '../type-variant-field.model';

export class ProductTypeFieldEntity {
  propertyCode: string;
  required: boolean;
  multiple: boolean;
  sortOrder: number;
  property: PropertyEntity;

  static fromModel(model: TypeProductFieldModel | TypeVariantFieldModel): ProductTypeFieldEntity {
    return {
      propertyCode: model.propertyCode,
      required: model.required,
      multiple: model.multiple,
      sortOrder: model.sortOrder,
      property: PropertyEntity.fromModel(model.property),
    };
  }
}
