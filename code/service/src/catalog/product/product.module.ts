import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BrandModel } from '../brand/brand.model';
import { ImageModel } from '../image/infrastructure/persistence/model/image.model';
import { ProductTypeModule } from '../product-type/product-type.module';
import { PropertyModule } from '../property/property.module';
import { ProductTypeModel } from '../product-type/product-type.model';
import { TypeProductFieldModel } from '../product-type/type-product-field.model';
import { TypeVariantFieldModel } from '../product-type/type-variant-field.model';
import { ProductController } from './controller/product.controller';
import { ProductCommandMapper } from './controller/mapper/product-command.mapper';
import { ProductPropertyValueModel } from './product-property-value.model';
import { ProductPropertyModel } from './product-property.model';
import { ProductModel } from './product.model';
import { ProductRepository } from './repository/product.repository';
import { ProductService } from './service/product.service';
import { PropertyAssignmentService } from './service/property-assignment.service';
import { ProductFilterService } from './service/product-filter.service';
import { VariantImageModel } from './variant-image.model';
import { VariantPropertyValueModel } from './variant-property-value.model';
import { VariantPropertyModel } from './variant-property.model';
import { VariantModel } from './variant.model';

@Module({
  imports: [
    ProductTypeModule,
    PropertyModule,
    TypeOrmModule.forFeature([
      ProductModel,
      VariantModel,
      ProductPropertyModel,
      ProductPropertyValueModel,
      VariantPropertyModel,
      VariantPropertyValueModel,
      VariantImageModel,
      ProductTypeModel,
      TypeProductFieldModel,
      TypeVariantFieldModel,
      BrandModel,
      ImageModel,
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductCommandMapper, ProductRepository, ProductService, PropertyAssignmentService, ProductFilterService],
  exports: [ProductRepository, ProductService, TypeOrmModule],
})
export class ProductModule {}
