import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { ProductTypeFieldLevel } from '../../product-type/product-type-field-level.enum';
import { PropertyKind } from '../../property/property-kind.enum';
import { PropertyRepository } from '../../property/repository/property.repository';
import { ProductPropertyFilterCommand } from './command/product-property-filter.command';
import { ProductFilterService } from './product-filter.service';

describe('ProductFilterService', () => {
  const propertyRepository = { getByCode: jest.fn() };
  const service = new ProductFilterService(propertyRepository as unknown as PropertyRepository);

  beforeEach(() => jest.clearAllMocks());

  it('accepts an integer range for an INTEGER property', async () => {
    propertyRepository.getByCode.mockResolvedValue({ code: 'height', kind: PropertyKind.INTEGER, options: [] });
    const filters = await service.normalize([
      filter({ level: ProductTypeFieldLevel.PRODUCT, propertyCode: 'height', integerFrom: '100', integerTo: '200' }),
    ]);
    expect(filters[0]).toMatchObject({
      propertyCode: 'height',
      propertyKind: PropertyKind.INTEGER,
      integerFrom: '100',
      integerTo: '200',
    });
  });

  it('rejects criteria that do not match the property kind', async () => {
    propertyRepository.getByCode.mockResolvedValue({ code: 'height', kind: PropertyKind.INTEGER, options: [] });
    await expect(
      service.normalize([filter({ level: ProductTypeFieldLevel.PRODUCT, propertyCode: 'height', text: 'tall' })]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('compares large exact decimals without converting them to float', async () => {
    propertyRepository.getByCode.mockResolvedValue({ code: 'price', kind: PropertyKind.DECIMAL, options: [] });
    await expect(
      service.normalize([
        filter({
          level: ProductTypeFieldLevel.PRODUCT,
          propertyCode: 'price',
          decimalFrom: '99999999999999999999999999.2',
          decimalTo: '99999999999999999999999999.1',
        }),
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate filters for the same level and property', async () => {
    propertyRepository.getByCode.mockResolvedValue({ code: 'available', kind: PropertyKind.BOOLEAN, options: [] });
    await expect(
      service.normalize([
        filter({ level: ProductTypeFieldLevel.VARIANT, propertyCode: 'available', boolean: true }),
        filter({ level: ProductTypeFieldLevel.VARIANT, propertyCode: 'available', boolean: false }),
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an option code that does not belong to the property', async () => {
    propertyRepository.getByCode.mockResolvedValue({
      code: 'color',
      kind: PropertyKind.OPTIONS,
      options: [{ code: 'blue' }],
    });
    await expect(
      service.normalize([
        filter({ level: ProductTypeFieldLevel.VARIANT, propertyCode: 'color', optionCodes: ['red'] }),
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function filter(value: Partial<ProductPropertyFilterCommand>): ProductPropertyFilterCommand {
  return plainToInstance(ProductPropertyFilterCommand, value);
}
