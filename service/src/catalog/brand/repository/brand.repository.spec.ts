import 'reflect-metadata';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BrandImageModel } from '../brand-image.model';
import { BrandModel } from '../brand.model';
import { BrandRepository } from './brand.repository';

describe('Brand updates and explicit image replacement', () => {
  const manager = { findOne: jest.fn(), save: jest.fn(), find: jest.fn(), delete: jest.fn(), insert: jest.fn() };
  const pageRepository = { findAndCount: jest.fn() };
  const dataSource = {
    transaction: jest.fn(async (work: (value: unknown) => unknown) => work(manager)),
    getRepository: jest.fn(() => pageRepository),
    manager,
  };
  const repository = new BrandRepository(dataSource as unknown as DataSource);
  const imageUuid = '1a8e6d33-6000-4000-8000-000000000001';

  beforeEach(() => jest.clearAllMocks());

  function existingBrand() {
    return { code: 'brand', name: 'Old name', description: 'Keep this', version: 2, images: [{ imageUuid, sortOrder: 0 }] };
  }

  it('preserves omitted description and images while incrementing the version', async () => {
    const brand = existingBrand();
    manager.findOne.mockResolvedValue(brand);
    manager.save.mockImplementation(async (_model: unknown, value: unknown) => value);

    const result = await repository.update('brand', 2, 'New name');
    expect(result).toMatchObject({ code: 'brand', name: 'New name', description: 'Keep this', version: 3, images: [{ imageUuid }] });
    expect(manager.delete).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('clears a description only when explicitly set to null', async () => {
    const brand = existingBrand();
    manager.findOne.mockResolvedValue(brand);
    await repository.update('brand', 2, undefined, null);
    expect(manager.save).toHaveBeenCalledWith(BrandModel, expect.objectContaining({ description: null, version: 3 }));
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('clears image links only for an explicit empty array', async () => {
    manager.findOne.mockResolvedValue(existingBrand());
    await repository.update('brand', 2, undefined, undefined, []);
    expect(manager.delete).toHaveBeenCalledWith(BrandImageModel, { brandCode: 'brand' });
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('rejects missing image references before deleting existing links', async () => {
    manager.findOne.mockResolvedValue(existingBrand());
    manager.find.mockResolvedValue([]);
    await expect(repository.update('brand', 2, undefined, undefined, [{ imageUuid }])).rejects.toThrow(NotFoundException);
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('does not write or replace images when the version is stale', async () => {
    manager.findOne.mockResolvedValue(existingBrand());
    await expect(repository.update('brand', 1, undefined, undefined, [])).rejects.toThrow(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('allows a version-checked no-op without incrementing the version', async () => {
    manager.findOne.mockResolvedValue(existingBrand());
    const result = await repository.update('brand', 2);
    expect(result.version).toBe(2);
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('paginates brands before loading their multiple images', async () => {
    const brand = existingBrand();
    const secondBrand = { ...existingBrand(), code: 'brand-b' };
    pageRepository.findAndCount.mockResolvedValue([[brand, secondBrand], 8]);
    manager.find.mockResolvedValue([
      { brandCode: 'brand', imageUuid, sortOrder: 0 },
      { brandCode: 'brand', imageUuid: '1a8e6d33-6000-4000-8000-000000000002', sortOrder: 1 },
    ]);

    const result = await repository.getAll(2, 3);
    expect(result).toMatchObject({ total: 8, limit: 2, offset: 3 });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].images).toHaveLength(2);
    expect(result.items[1].images).toEqual([]);
    expect(pageRepository.findAndCount).toHaveBeenCalledWith({ order: { code: 'ASC' }, take: 2, skip: 3 });
  });
});
