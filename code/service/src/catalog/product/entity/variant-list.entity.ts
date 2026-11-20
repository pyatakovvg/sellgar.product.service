import { VariantEntity } from './variant.entity';

export class VariantListEntity {
  productUuid: string;
  version: number;
  typeUuid: string;
  typeVersion: number;
  items: VariantEntity[];
}
