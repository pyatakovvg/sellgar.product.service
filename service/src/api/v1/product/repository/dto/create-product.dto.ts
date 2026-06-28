import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

class Property {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsUUID()
  propertyUuid: string;

  @IsString()
  value: string;
}

export class ProductVariantImage {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsUUID()
  @IsOptional()
  imageUuid?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  alt?: string | null;
}

class ProductVariant {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @ValidateNested({ each: true })
  @Type(() => ProductVariantImage)
  @IsOptional()
  images?: ProductVariantImage[];

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
