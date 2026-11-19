import { PropertyKind } from '../property-kind.enum';
import { PropertyModel } from '../property.model';
import { PropertyOptionEntity } from './property-option.entity';

export class PropertyEntity {
  code: string;
  name: string;
  description: string | null;
  kind: PropertyKind;
  unitCode: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  options: PropertyOptionEntity[];

  static fromModel(model: PropertyModel): PropertyEntity {
    return {
      code: model.code,
      name: model.name,
      description: model.description,
      kind: model.kind,
      unitCode: model.unitCode,
      version: model.version,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      options: (model.options ?? []).map((option) => ({
        code: option.code,
        name: option.name,
        sortOrder: option.sortOrder,
        extras: (option.extras ?? []).map((extra) => ({
          type: extra.type,
          sortOrder: extra.sortOrder,
          textDisplay: extra.textDisplay,
          valueText: extra.valueText,
          valueColor: extra.valueColor,
          imageUuid: extra.imageUuid,
        })),
      })),
    };
  }
}
