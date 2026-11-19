import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { PropertyAssignmentCommand } from './property-assignment.command';
import { VariantInputCommand } from './variant-input.command';

export class CreateProductCommand {
  @IsUUID()
  readonly typeUuid: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly typeVersion: number;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly brandCode: string;

  @IsOptional()
  @IsString()
  readonly description: string | null;

  @IsArray()
  @ArrayUnique((assignment: PropertyAssignmentCommand) => assignment.propertyCode)
  @ValidateNested({ each: true })
  @Type(() => PropertyAssignmentCommand)
  readonly properties: PropertyAssignmentCommand[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VariantInputCommand)
  readonly variants: VariantInputCommand[];
}
