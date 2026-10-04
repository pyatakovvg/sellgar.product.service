import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';

import { BrandModel } from '../catalog/brand/brand.model';
import { BrandImageModel } from '../catalog/brand/brand-image.model';
import { ImageModel } from '../catalog/image/infrastructure/persistence/model/image.model';
import { UnitModel } from '../catalog/unit/unit.model';
import { PropertyModel } from '../catalog/property/property.model';
import { PropertyOptionModel } from '../catalog/property/property-option.model';
import { PropertyOptionExtraModel } from '../catalog/property/property-option-extra.model';
import { ProductTypeModel } from '../catalog/product-type/product-type.model';
import { TypeProductFieldModel } from '../catalog/product-type/type-product-field.model';
import { TypeVariantFieldModel } from '../catalog/product-type/type-variant-field.model';
import { ProductModel } from '../catalog/product/product.model';
import { VariantModel } from '../catalog/product/variant.model';
import { ProductPropertyModel } from '../catalog/product/product-property.model';
import { ProductPropertyValueModel } from '../catalog/product/product-property-value.model';
import { VariantPropertyModel } from '../catalog/product/variant-property.model';
import { VariantPropertyValueModel } from '../catalog/product/variant-property-value.model';
import { VariantImageModel } from '../catalog/product/variant-image.model';

export function databaseOptions(env: NodeJS.ProcessEnv): DataSourceOptions {
  const database = requiredEnvironment(env, 'PRODUCT_DATABASE_NAME');
  const port = Number(env.PRODUCT_DATABASE_PORT ?? '5432');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PRODUCT_DATABASE_PORT must be a valid TCP port');
  }

  return {
    type: 'postgres',
    host: requiredEnvironment(env, 'PRODUCT_DATABASE_HOST'),
    port,
    username: requiredEnvironment(env, 'PRODUCT_DATABASE_USERNAME'),
    password: requiredEnvironment(env, 'PRODUCT_DATABASE_PASSWORD'),
    database,
    entities: [
      UnitModel,
      BrandModel,
      BrandImageModel,
      ImageModel,
      PropertyModel,
      PropertyOptionModel,
      PropertyOptionExtraModel,
      ProductTypeModel,
      TypeProductFieldModel,
      TypeVariantFieldModel,
      ProductModel,
      VariantModel,
      ProductPropertyModel,
      ProductPropertyValueModel,
      VariantPropertyModel,
      VariantPropertyValueModel,
      VariantImageModel,
    ],
    migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
    synchronize: false,
    migrationsRun: false,
    dropSchema: false,
    logging: false,
  };
}

export function requiredEnvironment(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing configuration: ${key}`);
  return value;
}
