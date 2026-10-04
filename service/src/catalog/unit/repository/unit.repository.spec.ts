import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { UnitModel } from '../unit.model';
import { UnitRepository } from './unit.repository';

describe('Unit versioned updates', () => {
  const manager = { findOne: jest.fn(), save: jest.fn(), insert: jest.fn(), findOneByOrFail: jest.fn() };
  const dataSource = { transaction: jest.fn(async (work: (value: unknown) => unknown) => work(manager)) };
  const repository = new UnitRepository(dataSource as unknown as DataSource);

  beforeEach(() => jest.clearAllMocks());

  it('preserves the symbol and code when only the name changes', async () => {
    const unit = { code: 'cm', name: 'Wrong name', symbol: 'см', version: 3 };
    manager.findOne.mockResolvedValue(unit);
    manager.save.mockImplementation(async (_model: unknown, value: unknown) => value);

    const result = await repository.update('cm', 3, 'Сантиметр');
    expect(result).toMatchObject({ code: 'cm', name: 'Сантиметр', symbol: 'см', version: 4 });
    expect(manager.findOne).toHaveBeenCalledWith(UnitModel, expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
  });

  it('rejects a stale version before writing', async () => {
    manager.findOne.mockResolvedValue({ code: 'cm', name: 'Length', symbol: 'cm', version: 4 });
    await expect(repository.update('cm', 3, 'Changed')).rejects.toThrow(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('does not increment a version for an omitted or unchanged patch', async () => {
    manager.findOne.mockResolvedValue({ code: 'cm', name: 'Length', symbol: 'cm', version: 4 });
    const result = await repository.update('cm', 4);
    expect(result.version).toBe(4);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('distinguishes a missing unit from a version conflict', async () => {
    manager.findOne.mockResolvedValue(null);
    await expect(repository.update('missing', 1, 'Length')).rejects.toThrow(NotFoundException);
  });

  it('turns a duplicate manual code into a conflict', async () => {
    manager.insert.mockRejectedValue(new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505' })));
    await expect(repository.create('cm', 'Length', 'cm')).rejects.toThrow(ConflictException);
  });
});
