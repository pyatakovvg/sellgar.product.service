import { IsEnum, IsInt, IsString, IsUUID, Matches, Max, Min, ValidateIf } from 'class-validator';

import { PropertyOptionExtraKind } from '../../property-option-extra-kind.enum';
import { PropertyOptionTextDisplay } from '../../property-option-text-display.enum';

export class PropertyOptionExtraDto {
  @IsEnum(PropertyOptionExtraKind)
  type: PropertyOptionExtraKind;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(PropertyOptionTextDisplay)
  textDisplay?: PropertyOptionTextDisplay;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  valueText?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/)
  valueColor?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsUUID()
  imageUuid?: string;
}
