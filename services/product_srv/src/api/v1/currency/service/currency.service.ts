import { Injectable } from '@nestjs/common';

import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

import { CurrencyRepository } from '../repository/currency.repository';

@Injectable()
export class CurrencyService {
  constructor(private readonly currencyRepository: CurrencyRepository) {}

  async findAll() {
    return Promise.all([this.currencyRepository.findAll(), this.currencyRepository.count()]).then(([data, count]) => {
      return {
        data: data,
        meta: {
          totalRows: count,
        },
      };
    });
  }

  findByUuid(code: string) {
    return this.currencyRepository.findById(code);
  }

  create(dto: CreateCurrencyDto) {
    return this.currencyRepository.create(dto);
  }

  update(dto: UpdateCurrencyDto) {
    return this.currencyRepository.update(dto);
  }

  remove() {
    return this.currencyRepository.remove();
  }
}
