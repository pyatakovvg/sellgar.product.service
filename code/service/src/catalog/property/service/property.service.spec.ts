import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';

import { PropertyKind } from '../property-kind.enum';
import { PropertyOptionExtraKind } from '../property-option-extra-kind.enum';
import { PropertyOptionTextDisplay } from '../property-option-text-display.enum';
import { PropertyModel } from '../property.model';
import { PropertyRepository } from '../repository/property.repository';
import { PropertyService } from './property.service';

describe('PropertyService aggregate rules', () => {
  const repository = {
    create: jest.fn(),
    update: jest.fn(),
    getAll: jest.fn(),
    getByCode: jest.fn(),
    createOption: jest.fn(),
    updateOption: jest.fn(),
  };
  const service = new PropertyService(repository as unknown as PropertyRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.create.mockImplementation(async (dto) => propertyModel(dto));
  });

  it('normalizes owned options and their typed extras before persistence', async () => {
    await service.create({
      code: 'color',
      name: 'Цвет',
      kind: PropertyKind.OPTIONS,
      options: [
        {
          code: 'red',
          name: 'Красный',
          extras: [
            { type: PropertyOptionExtraKind.COLOR, valueColor: '#ff0000' },
            { type: PropertyOptionExtraKind.TEXT, valueText: 'circle' },
          ],
        },
      ],
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        options: [
          expect.objectContaining({
            code: 'red',
            sortOrder: 0,
            extras: [
              { type: PropertyOptionExtraKind.COLOR, sortOrder: 0, valueColor: '#FF0000' },
              {
                type: PropertyOptionExtraKind.TEXT,
                sortOrder: 1,
                valueText: 'circle',
                textDisplay: PropertyOptionTextDisplay.TEXT,
              },
            ],
          }),
        ],
      }),
    );
  });

  it('rejects options for scalar properties', async () => {
    await expect(
      service.create({
        code: 'height',
        name: 'Высота',
        kind: PropertyKind.INTEGER,
        options: [{ code: 'one', name: 'Один' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects duplicate option codes and duplicate extra positions', async () => {
    await expect(
      service.create({
        code: 'material',
        name: 'Материал',
        kind: PropertyKind.OPTIONS,
        options: [
          { code: 'cotton', name: 'Хлопок' },
          { code: 'cotton', name: 'Другой хлопок' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({
        code: 'color',
        name: 'Цвет',
        kind: PropertyKind.OPTIONS,
        options: [
          {
            code: 'red',
            name: 'Красный',
            extras: [
              { type: PropertyOptionExtraKind.TEXT, sortOrder: 0, valueText: 'one' },
              { type: PropertyOptionExtraKind.TEXT, sortOrder: 0, valueText: 'two' },
            ],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an extra carrying fields of another type', async () => {
    await expect(
      service.create({
        code: 'color',
        name: 'Цвет',
        kind: PropertyKind.OPTIONS,
        options: [
          {
            code: 'red',
            name: 'Красный',
            extras: [
              {
                type: PropertyOptionExtraKind.COLOR,
                valueColor: '#FF0000',
                valueText: 'red',
              },
            ],
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function propertyModel(input: Partial<PropertyModel>): PropertyModel {
  return {
    code: input.code ?? 'property',
    name: input.name ?? 'Property',
    description: input.description ?? null,
    kind: input.kind ?? PropertyKind.TEXT,
    unitCode: input.unitCode ?? null,
    unit: null,
    options: [],
    version: 1,
    createdAt: new Date('2026-10-04T00:00:00Z'),
    updatedAt: new Date('2026-10-04T00:00:00Z'),
  };
}
