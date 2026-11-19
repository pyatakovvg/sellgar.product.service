import 'reflect-metadata';

import { PropertyAssignmentCommand } from '../../service/command/property-assignment.command';
import { PropertyValueCommand } from '../../service/command/property-value.command';
import { VariantInputCommand } from '../../service/command/variant-input.command';
import { CreateProductDto } from '../dto/create-product.dto';
import { ProductCommandMapper } from './product-command.mapper';

describe(ProductCommandMapper.name, () => {
  const mapper = new ProductCommandMapper();

  it('creates and validates the nested product command graph', async () => {
    const command = await mapper.toCreateCommand({
      typeUuid: '11111111-1111-4111-8111-111111111111',
      typeVersion: 1,
      name: 'Майка',
      brandCode: 'brand',
      properties: [{ propertyCode: 'material', values: [{ valueOptionCode: 'cotton' }] }],
      variants: [{ name: 'Синяя' }],
    } as CreateProductDto);

    expect(command.properties[0]).toBeInstanceOf(PropertyAssignmentCommand);
    expect(command.properties[0].values[0]).toBeInstanceOf(PropertyValueCommand);
    expect(command.variants[0]).toBeInstanceOf(VariantInputCommand);
  });
});
