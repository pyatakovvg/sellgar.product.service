import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreateDto } from '../repository/dto/create.dto';
import { UpdateDto } from '../repository/dto/update.dto';

import { CartService } from '../service/cart.service';

@Controller()
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @MessagePattern({ cmd: 'cart.getAll' })
  findAll() {
    return this.cartService.findAll();
  }

  @MessagePattern({ cmd: 'cart.getByUuid' })
  findByUuid(@Payload('uuid') uuid: string) {
    return this.cartService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'cart.create' })
  create(@Payload() dto: CreateDto) {
    return this.cartService.create(dto);
  }

  @MessagePattern({ cmd: 'cart.update' })
  update(@Payload() dto: UpdateDto) {
    return this.cartService.update(dto);
  }
}
