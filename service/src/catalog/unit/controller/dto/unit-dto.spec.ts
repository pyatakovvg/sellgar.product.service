import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

import { CreateUnitDto } from './create-unit.dto';
import { GetAllUnitsDto } from './get-all-units.dto';
import { UpdateUnitDto } from './update-unit.dto';

describe('Unit DTO', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true });

  it('normalizes a manually supplied code through the Nest boundary', async () => {
    const dto = await pipe.transform(
      { code: '  см / custom  ', name: ' Сантиметр ', symbol: ' см ' },
      { type: 'body', metatype: CreateUnitDto },
    );
    expect(dto).toEqual({ code: 'см / custom', name: 'Сантиметр', symbol: 'см' });
  });

  it.each([
    { code: '', name: 'Length', symbol: 'cm' },
    { code: 'cm', version: 0, name: 'Length' },
    { code: 'cm', version: 1, name: null },
  ])('rejects an invalid command: %j', async (payload) => {
    const metatype = 'version' in payload ? UpdateUnitDto : CreateUnitDto;
    await expect(pipe.transform(payload, { type: 'body', metatype })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies bounded pagination defaults', async () => {
    await expect(pipe.transform({}, { type: 'body', metatype: GetAllUnitsDto }))
      .resolves.toEqual({ limit: 50, offset: 0 });
    await expect(pipe.transform({ limit: 101 }, { type: 'body', metatype: GetAllUnitsDto }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
