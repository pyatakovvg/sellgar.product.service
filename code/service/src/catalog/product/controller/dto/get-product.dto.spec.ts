import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { GetProductDto } from './get-product.dto';

describe(GetProductDto.name, () => {
  const uuid = '20d243ba-4176-49d9-a832-e49405af2c12';

  it.each([undefined, true, false])('accepts withEmptyProperties=%s', async (withEmptyProperties) => {
    expect(await validate(plainToInstance(GetProductDto, { uuid, withEmptyProperties }))).toEqual([]);
  });

  it.each(['false', 'true', 0, 1])('rejects a non-boolean filter %s', async (withEmptyProperties) => {
    expect(await validate(plainToInstance(GetProductDto, { uuid, withEmptyProperties }))).not.toEqual([]);
  });
});
