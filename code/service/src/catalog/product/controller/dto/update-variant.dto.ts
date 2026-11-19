import { Transform, Type } from 'class-transformer';
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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { ProductUuidDto } from './product-uuid.dto';
import { PropertyAssignmentDto } from './property-assignment.dto';
import { VariantImageDto } from './variant-image.dto';

export class UpdateVariantDto extends ProductUuidDto {
  @IsUUID()
  variantUuid: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  version: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  typeVersion: number;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  name?: string;

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
