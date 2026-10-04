import { PropertyOptionExtraKind } from '../../property-option-extra-kind.enum';
import { PropertyOptionTextDisplay } from '../../property-option-text-display.enum';

export class PropertyOptionExtraCommand {
  constructor(
    readonly type: PropertyOptionExtraKind,
    readonly sortOrder?: number,
    readonly textDisplay?: PropertyOptionTextDisplay,
    readonly valueText?: string,
    readonly valueColor?: string,
    readonly imageUuid?: string,
  ) {}
}
