import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { PropertyAssignmentDto } from './property-assignment.dto';
import { VariantImageDto } from './variant-image.dto';

export class VariantInputDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  code: string;

  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  name: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique((assignment: PropertyAssignmentDto) => assignment.propertyCode)
  @ValidateNested({ each: true })
  @Type(() => PropertyAssignmentDto)
  properties?: PropertyAssignmentDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique((image: VariantImageDto) => image.imageUuid.toLowerCase())
  @ValidateNested({ each: true })
  @Type(() => VariantImageDto)
  images?: VariantImageDto[];
}
