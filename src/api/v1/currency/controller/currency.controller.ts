import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

import { CurrencyService } from '../service/currency.service';

@Controller()
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @MessagePattern({ cmd: 'currency.findAll' })
  findAll() {
    return this.currencyService.findAll();
  }

  @MessagePattern({ cmd: 'currency.findByUuid' })
  findByUuid(@Payload('code') code: string) {
    return this.currencyService.findByUuid(code);
  }

  @MessagePattern({ cmd: 'currency.create' })
  create(@Payload() dto: CreateCurrencyDto) {
    return this.currencyService.create(dto);
  }

  @MessagePattern({ cmd: 'currency.update' })
  update(@Payload() dto: UpdateCurrencyDto) {
    return this.currencyService.update(dto);
  }

  @MessagePattern({ cmd: 'currency.delete' })
  remove(@Payload('code') code: string) {
    return this.currencyService.remove(code);
  }
}
