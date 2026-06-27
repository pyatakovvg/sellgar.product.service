import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateStoreDto } from '../repository/dto/create-store.dto';
import { UpdateStoreDto } from '../repository/dto/update-store.dto';

import { OrderRepository } from '../repository/order.repository';

import { StoreResultEntity } from '../order.entity';

@Injectable()
export class OrderService {
  constructor(private readonly storeRepository: OrderRepository) {}

  async findAll() {
    const result = await Promise.all([this.storeRepository.findAll(), this.storeRepository.count()]).then(
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
    const resultInstance = plainToInstance(StoreResultEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  findByUuid(uuid: string) {
    return this.storeRepository.findByUuid(uuid);
  }

  create(dto: CreateStoreDto) {
    return this.storeRepository.create(dto);
  }

  update(dto: UpdateStoreDto) {
    return this.storeRepository.update(dto);
  }
}
