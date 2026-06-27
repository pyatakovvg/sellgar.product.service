import { Type } from 'class-transformer';
import { ValidateNested, IsUUID, IsString, IsOptional } from 'class-validator';

class Property {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsUUID()
  propertyUuid: string;

  @IsUUID()
  variantUuid: string;

  @IsString()
  value: string;
}

class ProductVariant {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @ValidateNested()
  @Type(() => Property)
  properties: Property[];
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsUUID()
  categoryUuid: string;

  @IsUUID()
  brandUuid: string;

  @ValidateNested()
  @Type(() => ProductVariant)
  variants: ProductVariant[];
}
