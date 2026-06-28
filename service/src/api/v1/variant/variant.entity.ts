import { Type, Expose } from 'class-transformer';
import { IsUUID, IsString, ValidateNested, IsNumber, IsDate, IsOptional, IsBoolean, IsEnum } from 'class-validator';

import { ProductEntity } from '../product/product.entity';
import { CatalogStatus } from '@/api/v1/catalog/catalog-status.enum';
import { PropertyEntity } from '@/api/v1/property/property.entity';
import { ImageEntity } from '../image/image.entity';

export class VariantPropertyEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsUUID()
  propertyUuid: string;

  @Expose()
  @ValidateNested()
  @Type(() => PropertyEntity)
  property: PropertyEntity;

  @Expose()
  @IsString()
  value: string;

  @Expose()
  @IsNumber()
  order: number;
}

export class VariantImageEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsUUID()
  imageUuid: string;

  @Expose()
  @ValidateNested()
  @Type(() => ImageEntity)
  image: ImageEntity;

  @Expose()
  @IsNumber()
  sortOrder: number;

  @Expose()
  @IsBoolean()
  isPrimary: boolean;

  @Expose()
  @IsString()
  @IsOptional()
  alt?: string | null;
}

export class VariantEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsNumber()
  version: number;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsString()
  description: string;

  @Expose()
  @IsEnum(CatalogStatus)
  status: CatalogStatus;

  @Expose()
  @ValidateNested()
  @Type(() => VariantPropertyEntity)
  properties: VariantPropertyEntity[];

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => VariantImageEntity)
  images: VariantImageEntity[];

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductEntity)
  product: ProductEntity;

  @Expose()
  @IsDate()
  createdAt: string;

  @Expose()
  @IsDate()
  updatedAt: string;
}

class MetaEntity {
  @Expose()
  @IsNumber()
  totalRows: number;
}

export class ProductVariantResultEntity {
  @Expose()
  @ValidateNested()
  @Type(() => VariantEntity)
  data: VariantEntity[];

  @Expose()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
