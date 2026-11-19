import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

import { PropertyOptionExtraKind } from '../../property-option-extra-kind.enum';
import { PropertyOptionTextDisplay } from '../../property-option-text-display.enum';

export class PropertyOptionExtraCommand {
  @IsEnum(PropertyOptionExtraKind)
  readonly type: PropertyOptionExtraKind;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  readonly sortOrder?: number;

  @IsOptional()
  @IsEnum(PropertyOptionTextDisplay)
  readonly textDisplay?: PropertyOptionTextDisplay;

  @IsOptional()
  @IsString()
  readonly valueText?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/)
  readonly valueColor?: string;

  @IsOptional()
  @IsUUID()
  readonly imageUuid?: string;
}
