import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { UnitModel } from '../unit.model';

@Injectable()
export class UnitRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getAll(limit: number, offset: number) {
    const [items, total] = await this.dataSource.getRepository(UnitModel).findAndCount({
      order: { code: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { items, total, limit, offset };
  }

  async getByCode(code: string) {
    const unit = await this.dataSource.getRepository(UnitModel).findOneBy({ code });
    if (!unit) throw new NotFoundException(`Unit ${code} not found`);
    return unit;
  }

  async create(code: string, name: string, symbol: string, description?: string | null) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.insert(UnitModel, { code, name, symbol, description: description ?? null, version: 1 });
        return manager.findOneByOrFail(UnitModel, { code });
      });
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') {
        throw new ConflictException(`Unit ${code} already exists`);
      }
      throw error;
    }
  }

  update(code: string, version: number, name?: string, symbol?: string, description?: string | null) {
    return this.dataSource.transaction(async (manager) => {
      const unit = await manager.findOne(UnitModel, { where: { code }, lock: { mode: 'pessimistic_write' } });
      if (!unit) throw new NotFoundException(`Unit ${code} not found`);
      if (unit.version !== version) throw new ConflictException(`Unit ${code} was changed by another request`);

      const nextName = name ?? unit.name;
      const nextSymbol = symbol ?? unit.symbol;
      const nextDescription = description === undefined ? unit.description : description;
      if (nextName === unit.name && nextSymbol === unit.symbol && nextDescription === unit.description) return unit;

      unit.name = nextName;
      unit.symbol = nextSymbol;
      unit.description = nextDescription;
      unit.version += 1;
      return manager.save(UnitModel, unit);
    });
  }
}
