import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { PropertyAssignmentCommand } from './property-assignment.command';
import { VariantImageCommand } from './variant-image.command';

export class VariantInputCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name: string;

  @IsOptional()
  @IsString()
  readonly description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique((assignment: PropertyAssignmentCommand) => assignment.propertyCode)
  @ValidateNested({ each: true })
  @Type(() => PropertyAssignmentCommand)
  readonly properties?: PropertyAssignmentCommand[];

  @IsOptional()
  @IsArray()
  @ArrayUnique((image: VariantImageCommand) => image.imageUuid.toLowerCase())
  @ValidateNested({ each: true })
  @Type(() => VariantImageCommand)
  readonly images?: VariantImageCommand[];
}
