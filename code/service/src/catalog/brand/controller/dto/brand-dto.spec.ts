import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { CreateBrandDto } from './create-brand.dto';
import { UpdateBrandDto } from './update-brand.dto';

describe('Brand DTO', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });
  const imageUuid = '1a8e6d33-6000-4000-8000-000000000001';

  it('preserves explicit nullable and collection semantics', async () => {
    const dto = await pipe.transform(
      { code: ' brand ', version: 1, description: null, images: [] },
      { type: 'body', metatype: UpdateBrandDto },
    );
    expect(dto).toEqual({ code: 'brand', version: 1, description: null, images: [] });
  });

  it.each([
    { code: 'brand', name: 'Brand', images: null },
    { code: 'brand', name: 'Brand', images: [{ imageUuid: 'invalid' }] },
    { code: 'brand', name: 'Brand', images: [{ imageUuid, sortOrder: -1 }] },
    { code: 'brand', name: 'Brand', images: [{ imageUuid }, { imageUuid: imageUuid.toUpperCase() }] },
  ])('rejects invalid nested images: %j', async (payload) => {
    await expect(pipe.transform(payload, { type: 'body', metatype: CreateBrandDto })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
