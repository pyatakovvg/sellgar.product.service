import { ProductPropertyValueModel } from '../product-property-value.model';
import { VariantPropertyValueModel } from '../variant-property-value.model';

export class PropertyValueEntity {
  valueText: string | null;
  valueInteger: string | null;
  valueDecimal: string | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueOptionCode: string | null;

  static fromModel(model: ProductPropertyValueModel | VariantPropertyValueModel): PropertyValueEntity {
    return {
      valueText: model.valueText,
      valueInteger: model.valueInteger,
      valueDecimal: model.valueDecimal,
      valueBoolean: model.valueBoolean,
      valueDate: model.valueDate,
      valueOptionCode: model.valueOptionCode,
    };
  }
}
