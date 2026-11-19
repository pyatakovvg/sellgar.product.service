import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

import { PropertyTypeEnum } from '../../property.model';
import { PropertyOptionMetadataValueTypeEnum } from '../../property-option-metadata.model';

export class PropertyOptionMetadataDto {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsEnum(PropertyOptionMetadataValueTypeEnum)
  valueType: PropertyOptionMetadataValueTypeEnum;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  textValue?: string | null;

  @IsString()
  @IsOptional()
  colorValue?: string | null;

  @IsUUID()
  @IsOptional()
  fileUuid?: string | null;

  @IsString()
  @IsOptional()
  iconCode?: string | null;
}

export class PropertyOptionDto {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ValidateNested({ each: true })
  @Type(() => PropertyOptionMetadataDto)
  @IsArray()
  @IsOptional()
  metadata?: PropertyOptionMetadataDto[];
}

export class CreatePropertyDto {
  @IsUUID()
  @IsOptional()
  unitUuid?: string | null;

  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(PropertyTypeEnum)
  type: PropertyTypeEnum;

  @ValidateNested({ each: true })
  @Type(() => PropertyOptionDto)
  @IsArray()
  @IsOptional()
  options?: PropertyOptionDto[];

}
