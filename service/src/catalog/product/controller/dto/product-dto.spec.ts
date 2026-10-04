import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { CreateProductDto } from './create-product.dto';

describe('Product transport DTO', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const typeUuid = '11111111-1111-4111-8111-111111111111';

  it('accepts an atomic product with one variant and nested typed values', async () => {
    const dto = await pipe.transform({
      code: ' shirt ',
      typeUuid,
      typeVersion: 1,
      name: ' Майка ',
      brandCode: ' brand ',
      properties: [{ propertyCode: 'material', values: [{ valueOptionCode: 'cotton' }] }],
      variants: [{ code: 'shirt-blue', name: ' Синяя ', properties: [{ propertyCode: 'size', values: [{ valueText: 'M' }] }] }],
    }, { type: 'body', metatype: CreateProductDto });

    expect(dto).toMatchObject({
      code: 'shirt',
      name: 'Майка',
      brandCode: 'brand',
      variants: [{ code: 'shirt-blue', name: 'Синяя' }],
    });
  });

  it('rejects a product without variants', async () => {
    await expect(pipe.transform({
      code: 'shirt', typeUuid, typeVersion: 1, name: 'Майка', brandCode: 'brand', variants: [],
    }, { type: 'body', metatype: CreateProductDto })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate variant and property codes at the transport boundary', async () => {
    await expect(pipe.transform({
      code: 'shirt',
      typeUuid,
      typeVersion: 1,
      name: 'Майка',
      brandCode: 'brand',
      properties: [
        { propertyCode: 'material', values: [{ valueText: 'one' }] },
        { propertyCode: 'material', values: [{ valueText: 'two' }] },
      ],
      variants: [{ code: 'blue', name: 'Blue' }, { code: 'blue', name: 'Duplicate' }],
    }, { type: 'body', metatype: CreateProductDto })).rejects.toBeInstanceOf(BadRequestException);
  });
});
