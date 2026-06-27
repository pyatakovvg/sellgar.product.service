import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrderService } from './service/order.service';
import { OrderRepository } from './repository/order.repository';
import { OrderController } from './controller/order.controller';

import { OrderModel } from './order.model';

@Module({
  imports: [TypeOrmModule.forFeature([OrderModel])],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
})
export class OrderModule {}
