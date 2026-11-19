import { ProductTypeModel } from '../product-type.model';
import { ProductTypeFieldEntity } from './product-type-field.entity';

export class ProductTypeEntity {
  uuid: string;
  name: string;
  version: number;
  activeProductCount: number;
  archivedProductCount: number;
  createdAt: Date;
  updatedAt: Date;
  productFields: ProductTypeFieldEntity[];
  variantFields: ProductTypeFieldEntity[];

  static fromModel(model: ProductTypeModel): ProductTypeEntity {
    return {
      uuid: model.uuid,
      name: model.name,
      version: model.version,
      activeProductCount: model.activeProductCount ?? 0,
      archivedProductCount: model.archivedProductCount ?? 0,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      productFields: (model.productFields ?? []).map(ProductTypeFieldEntity.fromModel),
      variantFields: (model.variantFields ?? []).map(ProductTypeFieldEntity.fromModel),
    };
  }
}
