import 'reflect-metadata';

import { PropertyOptionExtraCommand } from '../../service/command/property-option-extra.command';
import { PropertyOptionCommand } from '../../service/command/property-option.command';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { PropertyCommandMapper } from './property-command.mapper';

describe(PropertyCommandMapper.name, () => {
  const mapper = new PropertyCommandMapper();

  it('creates and validates the nested option command graph', async () => {
    const command = await mapper.toCreateCommand({
      code: 'color',
      name: 'Цвет',
      kind: 'OPTIONS',
      options: [
        {
          code: 'red',
          name: 'Красный',
          extras: [{ type: 'COLOR', valueColor: '#FF0000' }],
        },
      ],
    } as CreatePropertyDto);

    expect(command.options?.[0]).toBeInstanceOf(PropertyOptionCommand);
    expect(command.options?.[0].extras?.[0]).toBeInstanceOf(PropertyOptionExtraCommand);
  });
});
