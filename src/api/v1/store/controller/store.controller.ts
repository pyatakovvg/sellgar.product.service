import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreateStoreDto } from '../repository/dto/create-store.dto';
import { UpdateStoreDto } from '../repository/dto/update-store.dto';

import { StoreService } from '../service/store.service';

@Controller()
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @MessagePattern({ cmd: 'store.getAll' })
  findAll(@Payload('query') query: any) {
    return this.storeService.findAll(query);
  }

  @MessagePattern({ cmd: 'store.getByUuid' })
  findByUuid(@Payload('uuid') uuid: string) {
    return this.storeService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'store.create' })
  create(@Payload() dto: CreateStoreDto) {
    return this.storeService.create(dto);
  }

  @MessagePattern({ cmd: 'store.update' })
  update(@Payload() dto: UpdateStoreDto) {
    return this.storeService.update(dto);
  }
}
