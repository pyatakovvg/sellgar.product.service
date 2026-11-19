import { VariantImageModel } from '../variant-image.model';

export class VariantImageEntity {
  imageUuid: string;
  fileName: string;
  sortOrder: number;

  static fromModel(model: VariantImageModel): VariantImageEntity {
    return {
      imageUuid: model.imageUuid,
      fileName: model.image.fileName,
      sortOrder: model.sortOrder,
    };
  }
}
