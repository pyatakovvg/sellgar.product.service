import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxModule } from '@sellgar/outbox';

import { ProductService } from './service/product.service';
import { ProductRepository } from './repository/product.repository';
import { ProductController } from './controller/product.controller';

import { ProductModel } from './product.model';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductModel]),
    OutboxModule.forRoot({
      producer: 'product_srv',
      eventClientToken: 'PRODUCT_EVENT_SERVICE',
    }),
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
})
export class ProductModule {}
