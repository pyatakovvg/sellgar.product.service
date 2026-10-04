import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PropertyValueCommand {
  @IsOptional()
  @IsString()
  @MaxLength(65535)
  readonly valueText?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?\d+$/)
  readonly valueInteger?: string;

  @IsOptional()
  @IsString()
  @Matches(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/)
  readonly valueDecimal?: string;

  @IsOptional()
  @IsBoolean()
  readonly valueBoolean?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  readonly valueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  readonly valueOptionCode?: string;
}
