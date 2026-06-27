import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

import { CurrencyService } from '../service/currency.service';

@Controller()
export class CurrencyController {
  constructor(private readonly brandService: CurrencyService) {}

  @MessagePattern({ cmd: 'currency.findAll' })
  findAll() {
    return this.brandService.findAll();
  }

  @MessagePattern({ cmd: 'currency.findByUuid' })
  findByUuid(@Payload('code') code: string) {
    return this.brandService.findByUuid(code);
  }

  @MessagePattern({ cmd: 'currency.create' })
  create(@Payload() dto: CreateCurrencyDto) {
    return this.brandService.create(dto);
  }

  @MessagePattern({ cmd: 'currency.update' })
  update(@Payload() dto: UpdateCurrencyDto) {
    return this.brandService.update(dto);
  }

  @MessagePattern({ cmd: 'currency.delete' })
  remove() {
    return this.brandService.remove();
  }
}
