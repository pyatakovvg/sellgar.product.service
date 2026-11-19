import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { PropertyKind } from '../../../property/property-kind.enum';
import { PropertyValueCommand } from './property-value.command';

export class PropertyAssignmentCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly propertyCode: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyValueCommand)
  readonly values: PropertyValueCommand[];

  @IsOptional()
  @IsEnum(PropertyKind)
  readonly propertyKind?: PropertyKind;
}
