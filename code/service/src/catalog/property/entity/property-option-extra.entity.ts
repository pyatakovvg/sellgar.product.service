import { PropertyOptionExtraKind } from '../property-option-extra-kind.enum';
import { PropertyOptionTextDisplay } from '../property-option-text-display.enum';

export class PropertyOptionExtraEntity {
  type: PropertyOptionExtraKind;
  sortOrder: number;
  textDisplay: PropertyOptionTextDisplay | null;
  valueText: string | null;
  valueColor: string | null;
  imageUuid: string | null;
}
