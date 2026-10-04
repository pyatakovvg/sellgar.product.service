import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BrandCodeDto } from './dto/brand-code.dto';
import { BrandImageDto } from './dto/brand-image.dto';
import { CreateBrandDto } from './dto/create-brand.dto';
import { GetAllBrandsDto } from './dto/get-all-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandImageInput } from '../service/brand-image.input';
import { BrandService } from '../service/brand.service';

@Controller()
export class BrandController {
  constructor(private readonly service: BrandService) {}

  @MessagePattern({ cmd: 'catalog.v2.brand.getAll' })
  getAll(@Payload() dto: GetAllBrandsDto) { return this.service.getAll(dto.limit, dto.offset); }

  @MessagePattern({ cmd: 'catalog.v2.brand.getByCode' })
  getByCode(@Payload() dto: BrandCodeDto) { return this.service.getByCode(dto.code); }

  @MessagePattern({ cmd: 'catalog.v2.brand.create' })
  create(@Payload() dto: CreateBrandDto) {
    return this.service.create(dto.code, dto.name, dto.description, this.mapImages(dto.images));
  }

  @MessagePattern({ cmd: 'catalog.v2.brand.update' })
  update(@Payload() dto: UpdateBrandDto) {
    return this.service.update(dto.code, dto.version, dto.name, dto.description, this.mapImages(dto.images));
  }

  private mapImages(images: BrandImageDto[] | undefined): BrandImageInput[] | undefined {
    return images?.map((image) => new BrandImageInput(image.imageUuid, image.sortOrder));
  }
}
