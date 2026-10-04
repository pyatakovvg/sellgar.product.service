import { TypeVariantFieldModel } from '../../product-type/type-variant-field.model';
import { ProductStatus } from '../product-status.enum';
import { VariantModel } from '../variant.model';
import { ProductFieldEntity } from './product-field.entity';
import { VariantImageEntity } from './variant-image.entity';

export class VariantEntity {
  uuid: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  properties: ProductFieldEntity[];
  images: VariantImageEntity[];

  static fromModel(model: VariantModel, fields: TypeVariantFieldModel[]): VariantEntity {
    const assignments = new Map((model.properties ?? []).map((assignment) => [assignment.propertyCode, assignment]));
    return {
      uuid: model.uuid,
      name: model.name,
      description: model.description,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      properties: fields.map((field) => ProductFieldEntity.fromModels(field, assignments.get(field.propertyCode))),
      images: (model.images ?? []).map(VariantImageEntity.fromModel),
    };
  }
}
