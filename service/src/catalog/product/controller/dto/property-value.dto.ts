import { IsBoolean, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

export class PropertyValueDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(65535)
  valueText?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^-?\d+$/)
  valueInteger?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  valueDecimal?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  valueBoolean?: boolean;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  valueDate?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(256)
  valueOptionCode?: string;
}
