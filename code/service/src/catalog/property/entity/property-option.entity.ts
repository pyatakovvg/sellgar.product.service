import { PropertyOptionExtraEntity } from './property-option-extra.entity';

export class PropertyOptionEntity {
  code: string;
  name: string;
  sortOrder: number;
  extras: PropertyOptionExtraEntity[];
}
