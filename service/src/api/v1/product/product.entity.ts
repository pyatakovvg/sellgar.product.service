import { Type, Expose } from 'class-transformer';
import { IsUUID, IsString, IsOptional, ValidateNested, IsNumber, IsDate, IsEnum } from 'class-validator';

import { BrandEntity } from '@/api/v1/brand/brand.entity';
import { CatalogStatus } from '@/api/v1/catalog/catalog-status.enum';
import { CategoryEntity } from '@/api/v1/category/category.entity';
import { VariantEntity } from '@/api/v1/variant/variant.entity';

export class ProductEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsNumber()
  version: number;

  @Expose()
  @IsUUID()
  brandUuid: string;

  @Expose()
  @IsUUID()
  categoryUuid: string;

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
  @Type(() => CategoryEntity)
  category: CategoryEntity;

  @Expose()
  @ValidateNested()
  @Type(() => BrandEntity)
  brand: BrandEntity;

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => VariantEntity)
  variants: VariantEntity[];

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

export class ProductResultEntity {
  @Expose()
  @ValidateNested()
  @Type(() => ProductEntity)
  data: ProductEntity[];

  @Expose()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
