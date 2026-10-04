import { Injectable } from '@nestjs/common';
import { BrandRepository } from '../repository/brand.repository';
import { BrandImageInput } from './brand-image.input';

@Injectable()
export class BrandService {
  constructor(private readonly repository: BrandRepository) {}

  getAll(limit: number, offset: number) { return this.repository.getAll(limit, offset); }
  getByCode(code: string) { return this.repository.getByCode(code); }
  create(code: string, name: string, description?: string | null, images?: BrandImageInput[]) {
    return this.repository.create(code, name, description, images);
  }
  update(
    code: string,
    version: number,
    name?: string,
    description?: string | null,
    images?: BrandImageInput[],
  ) {
    return this.repository.update(code, version, name, description, images);
  }
}
