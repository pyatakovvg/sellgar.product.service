import { Injectable } from '@nestjs/common';

import { CreatePriceDto } from './dto/create-price.dto';

import { PriceResultEntity } from '../price.entity';

import { PriceRepository } from '../repository/price.repository';

@Injectable()
export class PriceService {
  constructor(private readonly priceRepository: PriceRepository) {}

  async findAll(storeUuid: string): Promise<PriceResultEntity> {
    return Promise.all([this.priceRepository.findAll(storeUuid), this.priceRepository.count(storeUuid)]).then(
      ([data, count]) => {
        return {
          data,
          meta: {
            totalRows: count,
          },
        };
      },
    );
  }

  create(storeUuid: string, dto: CreatePriceDto) {
    return this.priceRepository.create(storeUuid, dto);
  }
}
