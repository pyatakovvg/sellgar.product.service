import 'reflect-metadata';

import { BrandImageCommand } from '../../service/command/brand-image.command';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { BrandCommandMapper } from './brand-command.mapper';

describe(BrandCommandMapper.name, () => {
  const mapper = new BrandCommandMapper();

  it('creates and validates nested brand image commands without manual constructors', async () => {
    const command = await mapper.toCreateCommand({
      code: 'brand',
      name: 'Brand',
      images: [{ imageUuid: '11111111-1111-4111-8111-111111111111', sortOrder: 2 }],
    } as CreateBrandDto);

    expect(command.images?.[0]).toBeInstanceOf(BrandImageCommand);
    expect(command.images?.[0]).toMatchObject({ sortOrder: 2 });
  });
});
