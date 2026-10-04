import 'reflect-metadata';

import { validateOrReject } from 'class-validator';

import { ProductTypeFieldCommand } from '../../service/command/product-type-field.command';
import { CreateProductTypeDto } from '../dto/create-product-type.dto';
import { ProductTypeCommandMapper } from './product-type-command.mapper';

describe('ProductTypeCommandMapper', () => {
  const mapper = new ProductTypeCommandMapper();

  it('creates and validates nested command instances', async () => {
    const dto = Object.assign(new CreateProductTypeDto(), {
      name: 'Clothes',
      productFields: [{ propertyCode: 'material', required: true }],
      variantFields: [{ propertyCode: 'color', multiple: false }],
    });

    const command = await mapper.toCreateCommand(dto);

    expect(command.productFields?.[0]).toBeInstanceOf(ProductTypeFieldCommand);
    expect(command.variantFields?.[0]).toBeInstanceOf(ProductTypeFieldCommand);
    await expect(validateOrReject(command)).resolves.toBeUndefined();
  });

  it('rejects an invalid command instead of passing a plain object to the service', async () => {
    const dto = Object.assign(new CreateProductTypeDto(), {
      name: '',
      productFields: [{ propertyCode: '' }],
    });

    await expect(mapper.toCreateCommand(dto)).rejects.toBeDefined();
  });
});
