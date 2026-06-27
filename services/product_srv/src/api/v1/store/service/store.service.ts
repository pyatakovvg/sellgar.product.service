import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateStoreDto } from '../repository/dto/create-store.dto';
import { UpdateStoreDto } from '../repository/dto/update-store.dto';

import { StoreRepository } from '../repository/store.repository';

import { StoreResultEntity } from '../store.entity';

@Injectable()
export class StoreService {
  constructor(private readonly storeRepository: StoreRepository) {}

  async findAll(query: any) {
    const { data, count } = await this.storeRepository.findAllAndCount(query);

    const result = {
      data,
      meta: {
        totalRows: count,
      },
    };
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
