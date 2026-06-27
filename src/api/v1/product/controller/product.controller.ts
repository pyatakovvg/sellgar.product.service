import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreateProductDto } from '../repository/dto/create-product.dto';
import { UpdateProductDto } from '../repository/dto/update-product.dto';

import { ProductService } from '../service/product.service';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @MessagePattern({ cmd: 'product.getAll' })
  findAll() {
    return this.productService.findAll();
  }

  @MessagePattern({ cmd: 'product.getByUuid' })
  findByUuid(@Payload('uuid') uuid: string) {
    return this.productService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'product.create' })
  create(@Payload() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @MessagePattern({ cmd: 'product.update' })
  update(@Payload() dto: UpdateProductDto) {
    return this.productService.update(dto);
  }

}
