import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { ProductOutboxService } from '../../../integration/outbox/product-outbox.service';
import { PropertyKind } from '../property-kind.enum';
import { PropertyOptionExtraKind } from '../property-option-extra-kind.enum';
import { PropertyOptionExtraModel } from '../property-option-extra.model';
import { PropertyOptionModel } from '../property-option.model';
import { PropertyModel } from '../property.model';
import { UpdatePropertyOptionCommand } from '../service/command/update-property-option.command';
import { PropertyRepository } from './property.repository';

describe('PropertyRepository option updates', () => {
  it('locks the option without joining nullable extras', async () => {
    const property = Object.assign(new PropertyModel(), {
      code: 'color',
      name: 'Color',
      description: null,
      kind: PropertyKind.OPTIONS,
      unitCode: null,
      version: 2,
      options: [],
    });
    const option = Object.assign(new PropertyOptionModel(), {
      propertyCode: 'color',
      code: 'blue',
      name: 'Blue',
      sortOrder: 0,
      extras: [],
    });
    const extras = [
      Object.assign(new PropertyOptionExtraModel(), {
        propertyCode: 'color',
        optionCode: 'blue',
        type: PropertyOptionExtraKind.COLOR,
        sortOrder: 0,
        textDisplay: null,
        valueText: null,
        valueColor: '#336699',
        imageUuid: null,
      }),
    ];
    const result = Object.assign(new PropertyModel(), property, {
      options: [Object.assign(new PropertyOptionModel(), option, { extras })],
    });
    const manager = {
      findOne: jest.fn().mockResolvedValueOnce(property).mockResolvedValueOnce(option).mockResolvedValueOnce(result),
      find: jest.fn().mockResolvedValue(extras),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      insert: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn(async (work: (entityManager: typeof manager) => Promise<PropertyModel>) => work(manager)),
    } as unknown as DataSource;
    const outbox = { touchByProperty: jest.fn() } as unknown as ProductOutboxService;
    const repository = new PropertyRepository(dataSource, outbox);
    const command = Object.assign(new UpdatePropertyOptionCommand(), {
      code: 'color',
      optionCode: 'blue',
      version: 2,
      name: 'Blue',
      sortOrder: 0,
      extras: [{ type: PropertyOptionExtraKind.COLOR, sortOrder: 0, valueColor: '#336699' }],
    });

    await expect(repository.updateOption(command)).resolves.toBe(result);

    expect(manager.findOne).toHaveBeenNthCalledWith(2, PropertyOptionModel, {
      where: { propertyCode: 'color', code: 'blue' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(manager.find).toHaveBeenCalledWith(PropertyOptionExtraModel, {
      where: { propertyCode: 'color', optionCode: 'blue' },
      order: { sortOrder: 'ASC', type: 'ASC' },
    });
  });
});
