import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateDto } from '../repository/dto/create.dto';
import { UpdateDto } from '../repository/dto/update.dto';

import { ShopRepository } from '../repository/shop.repository';

import { ShopResultEntity } from '../shop.entity';

@Injectable()
export class ShopService {
  constructor(private readonly shopRepository: ShopRepository) {}

  async findAll() {
    const result = await Promise.all([this.shopRepository.findAll(), this.shopRepository.count()]).then(
      ([data, count]) => {
        return {
          data: data,
          meta: {
            totalRows: count,
          },
        };
      },
    );
    const resultInstance = plainToInstance(ShopResultEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  findByUuid(uuid: string) {
    return this.shopRepository.findByUuid(uuid);
  }

  create(dto: CreateDto) {
    return this.shopRepository.create(dto);
  }

  update(dto: UpdateDto) {
    return this.shopRepository.update(dto);
  }
}
