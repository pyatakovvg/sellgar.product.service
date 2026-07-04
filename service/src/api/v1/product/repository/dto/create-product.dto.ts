import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ProductPropertyDto {
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

  @IsNumber()
  @IsOptional()
  order?: number;

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

  @ValidateNested({ each: true })
  @Type(() => ProductPropertyDto)
  properties: ProductPropertyDto[];
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

  @ValidateNested({ each: true })
  @Type(() => ProductPropertyDto)
  @IsOptional()
  properties?: ProductPropertyDto[];

  @ValidateNested({ each: true })
  @Type(() => ProductVariant)
  variants: ProductVariant[];
}
