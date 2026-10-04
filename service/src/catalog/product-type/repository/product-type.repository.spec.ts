import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DataSource } from 'typeorm';

import { PropertyKind } from '../../property/property-kind.enum';
import { ProductTypeFieldCommand } from '../service/command/product-type-field.command';
import { UpdateProductTypeCommand } from '../service/command/update-product-type.command';
import { ProductTypeRepository } from './product-type.repository';

describe('ProductTypeRepository aggregate update constraints', () => {
  const manager = {
    findOne: jest.fn(),
    find: jest.fn(),
    query: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
    getRepository: jest.fn(),
  };
  const productTypeStore = { findAndCount: jest.fn() };
  const countQuery = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(async (work: (value: unknown) => unknown) => work(manager)),
    getRepository: jest.fn(() => productTypeStore),
    manager,
  };
  const productOutbox = { touchByType: jest.fn().mockResolvedValue([]) };
  const repository = new ProductTypeRepository(dataSource as unknown as DataSource, productOutbox as never);
  const uuid = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    productOutbox.touchByType.mockResolvedValue([]);
    manager.getRepository.mockReturnValue({ createQueryBuilder: () => countQuery });
    countQuery.select.mockReturnThis();
    countQuery.addSelect.mockReturnThis();
    countQuery.where.mockReturnThis();
    countQuery.groupBy.mockReturnThis();
    countQuery.getRawMany.mockResolvedValue([]);
  });

  it('returns the number of products created from every type', async () => {
    productTypeStore.findAndCount.mockResolvedValueOnce([
      [
        { uuid, name: 'Clothes' },
        { uuid: '22222222-2222-4222-8222-222222222222', name: 'Electronics' },
      ],
      2,
    ]);
    countQuery.getRawMany.mockResolvedValueOnce([
      { typeUuid: uuid, activeProductCount: '3', archivedProductCount: '2' },
    ]);

    const page = await repository.getAll(50, 0);

    expect(page.items.map((item) => [item.activeProductCount, item.archivedProductCount])).toEqual([
      [3, 2],
      [0, 0],
    ]);
  });

  it('blocks multiple-to-single while an existing consumer has several values', async () => {
    manager.findOne.mockResolvedValueOnce({ uuid, version: 2 });
    manager.find
      .mockResolvedValueOnce([
        { propertyCode: 'material', propertyKind: PropertyKind.OPTIONS, required: false, multiple: true, sortOrder: 0 },
      ])
      .mockResolvedValueOnce([{ code: 'material', kind: PropertyKind.OPTIONS }]);
    manager.query.mockResolvedValue([{ exists: 1 }]);

    await expect(
      repository.update(
        updateCommand({
          uuid,
          version: 2,
          productFields: [fieldCommand('material', false, false, 0)],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
  });

  it('rejects multiple BOOLEAN fields independently of current data', async () => {
    manager.findOne.mockResolvedValueOnce({ uuid, version: 2 });
    manager.find
      .mockResolvedValueOnce([
        {
          propertyCode: 'available',
          propertyKind: PropertyKind.BOOLEAN,
          required: false,
          multiple: false,
          sortOrder: 0,
        },
      ])
      .mockResolvedValueOnce([{ code: 'available', kind: PropertyKind.BOOLEAN }]);

    await expect(
      repository.update(
        updateCommand({
          uuid,
          version: 2,
          variantFields: [fieldCommand('available', false, true, 0)],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('reconciles one supplied field collection and increments the aggregate version once', async () => {
    manager.findOne
      .mockResolvedValueOnce({ uuid, version: 2, name: 'Clothes' })
      .mockResolvedValueOnce({ uuid, version: 3, name: 'Clothes', productFields: [], variantFields: [] });
    manager.find
      .mockResolvedValueOnce([
        { propertyCode: 'height', propertyKind: PropertyKind.INTEGER, required: false, multiple: false, sortOrder: 0 },
        { propertyCode: 'color', propertyKind: PropertyKind.OPTIONS, required: false, multiple: false, sortOrder: 1 },
      ])
      .mockResolvedValueOnce([
        { code: 'height', kind: PropertyKind.INTEGER },
        { code: 'width', kind: PropertyKind.INTEGER },
      ]);

    await repository.update(
      updateCommand({
        uuid,
        version: 2,
        productFields: [fieldCommand('height', true, false, 1), fieldCommand('width', false, false, 2)],
      }),
    );

    expect(manager.delete).toHaveBeenCalledWith(expect.any(Function), {
      typeUuid: uuid,
      propertyCode: expect.any(Object),
    });
    expect(manager.update).toHaveBeenCalledWith(
      expect.any(Function),
      { typeUuid: uuid, propertyCode: 'height' },
      { required: true, multiple: false, sortOrder: 1 },
    );
    expect(manager.insert).toHaveBeenCalledWith(expect.any(Function), [
      {
        typeUuid: uuid,
        propertyCode: 'width',
        propertyKind: PropertyKind.INTEGER,
        required: false,
        multiple: false,
        sortOrder: 2,
      },
    ]);
    expect(manager.save).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ version: 3 }));
    expect(productOutbox.touchByType).toHaveBeenCalledWith(manager, uuid);
  });

  function updateCommand(value: object): UpdateProductTypeCommand {
    return plainToInstance(UpdateProductTypeCommand, value);
  }

  function fieldCommand(
    propertyCode: string,
    required: boolean,
    multiple: boolean,
    sortOrder: number,
  ): ProductTypeFieldCommand {
    return plainToInstance(ProductTypeFieldCommand, { propertyCode, required, multiple, sortOrder });
  }
});
