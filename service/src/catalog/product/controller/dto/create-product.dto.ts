import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { ProductCodeDto } from './product-code.dto';
import { PropertyAssignmentDto } from './property-assignment.dto';
import { VariantInputDto } from './variant-input.dto';

export class CreateProductDto extends ProductCodeDto {
  @IsUUID()
  typeUuid: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  typeVersion: number;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  brandCode: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique((assignment: PropertyAssignmentDto) => assignment.propertyCode)
  @ValidateNested({ each: true })
  @Type(() => PropertyAssignmentDto)
  properties?: PropertyAssignmentDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((variant: VariantInputDto) => variant.code)
  @ValidateNested({ each: true })
  @Type(() => VariantInputDto)
  variants: VariantInputDto[];
}
