import { Controller, Get, Param } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { VariantService } from '../service/variant.service';
import { AddVariantImageDto } from '../repository/dto/add-variant-image.dto';

@Controller()
export class VariantController {
  constructor(private readonly productVariantService: VariantService) {}

  @MessagePattern({ cmd: 'product.variant.findAll' })
  findAll() {
    return this.productVariantService.findAll();
  }

  @Get(':uuid')
  findByUuid(@Param('uuid') uuid: string) {
    return this.productVariantService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'product.variant.getByUuid' })
  findByUuidMessage(@Payload('uuid') uuid: string) {
    return this.productVariantService.findByUuid(uuid);
  }

  @MessagePattern({ cmd: 'product.variant.addImage' })
  addImage(@Payload() dto: AddVariantImageDto) {
    return this.productVariantService.addImage(dto);
  }

  @MessagePattern({ cmd: 'product.variant.removeImage' })
  removeImage(@Payload() dto: { variantUuid: string; imageUuid: string }) {
    return this.productVariantService.removeImage(dto.variantUuid, dto.imageUuid);
  }

  @MessagePattern({ cmd: 'product.variant.detachImage' })
  detachImage(@Payload() dto: { imageUuid: string }) {
    return this.productVariantService.detachImage(dto.imageUuid);
  }
}
