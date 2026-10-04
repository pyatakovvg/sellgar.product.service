import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BrandModule } from './catalog/brand/brand.module';
import { ImageModule } from './catalog/image/image.module';
import { PropertyModule } from './catalog/property/property.module';
import { ProductTypeModule } from './catalog/product-type/product-type.module';
import { ProductModule } from './catalog/product/product.module';
import { UnitModule } from './catalog/unit/unit.module';
import { databaseOptions } from './database/database.options';
import { InboxModule } from './integration/inbox/inbox.module';
import { ProductOutboxModule } from './integration/outbox/product-outbox.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({ useFactory: () => databaseOptions(process.env) }),
    InboxModule,
    ProductOutboxModule,
    UnitModule,
    BrandModule,
    ImageModule,
    PropertyModule,
    ProductTypeModule,
    ProductModule,
  ],
})
export class AppModule {}
