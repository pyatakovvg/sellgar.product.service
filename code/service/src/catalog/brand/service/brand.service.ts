import { Injectable } from '@nestjs/common';

import { BrandRepository } from '../repository/brand.repository';
import { CreateBrandCommand } from './command/create-brand.command';
import { UpdateBrandCommand } from './command/update-brand.command';

@Injectable()
export class BrandService {
  constructor(private readonly repository: BrandRepository) {}

  getAll(limit: number, offset: number) {
    return this.repository.getAll(limit, offset);
  }
  getByCode(code: string) {
    return this.repository.getByCode(code);
  }
  create(command: CreateBrandCommand) {
    return this.repository.create(command.code, command.name, command.description, command.images);
  }

  update(command: UpdateBrandCommand) {
    return this.repository.update(command.code, command.version, command.name, command.description, command.images);
  }
}
