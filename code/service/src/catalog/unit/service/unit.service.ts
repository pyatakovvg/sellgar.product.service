import { Injectable } from '@nestjs/common';
import { UnitRepository } from '../repository/unit.repository';

@Injectable()
export class UnitService {
  constructor(private readonly repository: UnitRepository) {}

  getAll(limit: number, offset: number) {
    return this.repository.getAll(limit, offset);
  }
  getByCode(code: string) {
    return this.repository.getByCode(code);
  }
  create(code: string, name: string, symbol: string, description?: string | null) {
    return this.repository.create(code, name, symbol, description);
  }
  update(code: string, version: number, name?: string, symbol?: string, description?: string | null) {
    return this.repository.update(code, version, name, symbol, description);
  }
}
