import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { Injectable } from '@nestjs/common';

import { CreateProductDto } from '../repository/dto/create-product.dto';
import { UpdateProductDto } from '../repository/dto/update-product.dto';

import { ProductResultEntity } from '../product.entity';

import { ProductRepository } from '../repository/product.repository';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async findAll() {
    const result = await Promise.all([this.productRepository.findAll(), this.productRepository.count()]).then(
      ([data, count]) => {
        return {
          data: data,
          meta: {
            totalRows: count,
          },
        };
      },
    );
    const resultInstance = plainToInstance(ProductResultEntity, result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  findByUuid(uuid: string) {
    return this.productRepository.findByUuid(uuid);
  }

  create(dto: CreateProductDto) {
    return this.productRepository.create(dto);
  }

  async update(dto: UpdateProductDto) {
    return this.productRepository.update(dto);
  }
}
