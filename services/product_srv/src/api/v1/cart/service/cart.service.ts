import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateDto } from '../repository/dto/create.dto';
import { UpdateDto } from '../repository/dto/update.dto';

import { CartRepository } from '../repository/cart.repository';

import { CartResultEntity } from '../cart.entity';

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}

  async findAll() {
    const result = await Promise.all([this.cartRepository.findAll(), this.cartRepository.count()]).then(
      ([data, count]) => {
        console.log(data, count);
        return {
          data: data,
          meta: {
            totalRows: count,
          },
        };
      },
    );
    const resultInstance = plainToInstance(CartResultEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  findByUuid(uuid: string) {
    return this.cartRepository.findByUuid(uuid);
  }

  create(dto: CreateDto) {
    return this.cartRepository.create(dto);
  }

  update(dto: UpdateDto) {
    return this.cartRepository.update(dto);
  }
}
