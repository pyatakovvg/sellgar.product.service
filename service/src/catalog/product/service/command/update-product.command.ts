import { Type } from 'class-transformer';
import {
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

export class UpdateProductCommand {
  @IsUUID()
  readonly uuid: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly version: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly typeVersion: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly description?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly brandCode?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique((assignment: PropertyAssignmentCommand) => assignment.propertyCode)
  @ValidateNested({ each: true })
  @Type(() => PropertyAssignmentCommand)
  readonly properties?: PropertyAssignmentCommand[];
}
