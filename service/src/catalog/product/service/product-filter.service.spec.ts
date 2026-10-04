import { BadRequestException } from '@nestjs/common';

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
      new ProductPropertyFilterCommand(ProductTypeFieldLevel.PRODUCT, 'height', undefined, undefined, '100', '200'),
    ]);
    expect(filters[0]).toMatchObject({ propertyCode: 'height', propertyKind: PropertyKind.INTEGER, integerFrom: '100', integerTo: '200' });
  });

  it('rejects criteria that do not match the property kind', async () => {
    propertyRepository.getByCode.mockResolvedValue({ code: 'height', kind: PropertyKind.INTEGER, options: [] });
    await expect(service.normalize([
      new ProductPropertyFilterCommand(ProductTypeFieldLevel.PRODUCT, 'height', undefined, 'tall'),
    ])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('compares large exact decimals without converting them to float', async () => {
    propertyRepository.getByCode.mockResolvedValue({ code: 'price', kind: PropertyKind.DECIMAL, options: [] });
    await expect(service.normalize([
      new ProductPropertyFilterCommand(
        ProductTypeFieldLevel.PRODUCT,
        'price',
        undefined,
        undefined,
        undefined,
        undefined,
        '99999999999999999999999999.2',
        '99999999999999999999999999.1',
      ),
    ])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate filters for the same level and property', async () => {
    propertyRepository.getByCode.mockResolvedValue({ code: 'available', kind: PropertyKind.BOOLEAN, options: [] });
    await expect(service.normalize([
      new ProductPropertyFilterCommand(ProductTypeFieldLevel.VARIANT, 'available', undefined, undefined, undefined, undefined, undefined, undefined, true),
      new ProductPropertyFilterCommand(ProductTypeFieldLevel.VARIANT, 'available', undefined, undefined, undefined, undefined, undefined, undefined, false),
    ])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an option code that does not belong to the property', async () => {
    propertyRepository.getByCode.mockResolvedValue({
      code: 'color',
      kind: PropertyKind.OPTIONS,
      options: [{ code: 'blue' }],
    });
    await expect(service.normalize([
      new ProductPropertyFilterCommand(
        ProductTypeFieldLevel.VARIANT,
        'color',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['red'],
      ),
    ])).rejects.toBeInstanceOf(BadRequestException);
  });
});
