import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreatePriceDto } from './dto/create-price.dto';
import { FindAllPriceDto } from './dto/find-all-price.dto';

import { PriceService } from '../service/price.service';

@Controller()
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @MessagePattern({ cmd: 'store.price.findAll' })
  findAll(@Payload() dto: FindAllPriceDto) {
    return this.priceService.findAll(dto.uuid);
  }

  @MessagePattern({ cmd: 'store.price.create' })
  create(@Payload() dto: CreatePriceDto) {
    return this.priceService.create(dto.uuid, dto);
  }
}
