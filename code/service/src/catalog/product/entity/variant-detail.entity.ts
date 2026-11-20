import { VariantEntity } from './variant.entity';

export class VariantDetailEntity extends VariantEntity {
  productUuid: string;
  version: number;
  typeUuid: string;
  typeVersion: number;
}
