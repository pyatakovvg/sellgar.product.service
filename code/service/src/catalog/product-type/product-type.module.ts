import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PropertyModel } from '../property/property.model';
import { ProductTypeCommandMapper } from './controller/mapper/product-type-command.mapper';
import { ProductTypeController } from './controller/product-type.controller';
import { ProductTypeModel } from './product-type.model';
import { ProductTypeRepository } from './repository/product-type.repository';
import { ProductTypeService } from './service/product-type.service';
import { TypeProductFieldModel } from './type-product-field.model';
import { TypeVariantFieldModel } from './type-variant-field.model';

@Module({
  imports: [TypeOrmModule.forFeature([ProductTypeModel, TypeProductFieldModel, TypeVariantFieldModel, PropertyModel])],
  controllers: [ProductTypeController],
  providers: [ProductTypeCommandMapper, ProductTypeRepository, ProductTypeService],
  exports: [ProductTypeRepository, ProductTypeService, TypeOrmModule],
})
export class ProductTypeModule {}
