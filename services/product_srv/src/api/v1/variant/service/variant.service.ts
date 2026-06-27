import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

// import { CreateProductDto } from '../repository/dto/create-product.dto';
// import { UpdateProductDto } from '../repository/dto/update-product.dto';

import { ProductVariantResultEntity } from '../variant.entity';

import { VariantRepository } from '../repository/variant.repository';

@Injectable()
export class VariantService {
  constructor(private readonly productVariantRepository: VariantRepository) {}

  async findAll() {
    const result = await Promise.all([
      this.productVariantRepository.findAll(),
      this.productVariantRepository.count(),
    ]).then(([data, count]) => {
      return {
        data: data,
        meta: {
          totalRows: count,
        },
      };
    });

    const resultInstance = plainToInstance(ProductVariantResultEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  findByUuid() {
    return this.productVariantRepository.findByUuid();
  }

  create() {
    return this.productVariantRepository.create();
  }

  update() {
    return this.productVariantRepository.update();
  }
}
