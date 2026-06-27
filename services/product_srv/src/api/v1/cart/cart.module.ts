import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CartService } from './service/cart.service';
import { CartRepository } from './repository/cart.repository';
import { CartController } from './controller/cart.controller';

import { CartModel } from './cart.model';

@Module({
  imports: [TypeOrmModule.forFeature([CartModel])],
  controllers: [CartController],
  providers: [CartService, CartRepository],
})
export class CartModule {}
