import { ProductModel } from '../product.model';
import { ProductStatus } from '../product-status.enum';
import { ProductFieldEntity } from './product-field.entity';
import { VariantEntity } from './variant.entity';

export class ProductEntity {
  code: string;
  typeUuid: string;
  typeVersion: number;
  name: string;
  description: string | null;
  brandCode: string;
  status: ProductStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  properties: ProductFieldEntity[];
  variants: VariantEntity[];

  static fromModel(model: ProductModel): ProductEntity {
    const assignments = new Map((model.properties ?? []).map((assignment) => [assignment.propertyCode, assignment]));
    const productFields = model.productType.productFields ?? [];
    const variantFields = model.productType.variantFields ?? [];
    return {
      code: model.code,
      typeUuid: model.typeUuid,
      typeVersion: model.productType.version,
      name: model.name,
      description: model.description,
      brandCode: model.brandCode,
      status: model.status,
      version: model.version,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      properties: productFields.map((field) => ProductFieldEntity.fromModels(field, assignments.get(field.propertyCode))),
      variants: (model.variants ?? []).map((variant) => VariantEntity.fromModel(variant, variantFields)),
    };
  }
}
