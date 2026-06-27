import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CreateBrandDto } from '../repository/dto/create-brand.dto';
import { UpdateBrandDto } from '../repository/dto/update-brand.dto';

import { BrandService } from '../service/brand.service';

@Controller()
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @MessagePattern({ cmd: 'brand.findAll' })
  findAll() {
    return this.brandService.findAll();
  }

  @MessagePattern({ cmd: 'brand.findByUuid' })
  findByUuid(@Payload('uuid') uuid: string) {
    return this.brandService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'brand.create' })
  create(@Payload() dto: CreateBrandDto) {
    return this.brandService.create(dto);
  }

  @MessagePattern({ cmd: 'brand.update' })
  update(@Payload() dto: UpdateBrandDto) {
    return this.brandService.update(dto);
  }

  @MessagePattern({ cmd: 'brand.delete' })
  remove(@Payload('uuid') uuid: string) {
    return this.brandService.remove(uuid);
  }
}
