import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { PropertyKind } from '../../property/property-kind.enum';
import { TypeProductFieldModel } from '../../product-type/type-product-field.model';
import { PropertyAssignmentCommand } from './command/property-assignment.command';
import { PropertyValueCommand } from './command/property-value.command';
import { PropertyAssignmentService } from './property-assignment.service';

describe('PropertyAssignmentService', () => {
  const service = new PropertyAssignmentService();

  it('normalizes typed values and preserves false', () => {
    const result = service.forCreate(
      [field('available', PropertyKind.BOOLEAN, true, false)],
      [assignment('available', { valueBoolean: false })],
      'product shirt',
    );
    expect(result[0]).toMatchObject({
      propertyCode: 'available',
      propertyKind: PropertyKind.BOOLEAN,
      values: [{ valueBoolean: false }],
    });
  });

  it('requires configured fields only for a new owner', () => {
    const fields = [field('material', PropertyKind.OPTIONS, true, false, ['cotton'])];
    expect(() => service.forCreate(fields, [], 'product shirt')).toThrow(BadRequestException);
    expect(service.forPatch(fields, [], 'product shirt')).toEqual([]);
  });

  it('rejects a value with the wrong typed column', () => {
    expect(() =>
      service.forCreate(
        [field('height', PropertyKind.INTEGER, true, false)],
        [assignment('height', { valueText: '100' })],
        'product item',
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects unknown options and excess precision', () => {
    expect(() =>
      service.forCreate(
        [field('material', PropertyKind.OPTIONS, true, false, ['cotton'])],
        [assignment('material', { valueOptionCode: 'wool' })],
        'product shirt',
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      service.forCreate(
        [field('weight', PropertyKind.DECIMAL, true, false)],
        [assignment('weight', { valueDecimal: '1.1234567890123' })],
        'product shirt',
      ),
    ).toThrow(BadRequestException);
  });

  it('allows explicit clearing only for optional fields', () => {
    expect(
      service.forPatch([field('note', PropertyKind.TEXT, false, false)], [assignment('note')], 'variant blue'),
    ).toEqual([expect.objectContaining({ propertyCode: 'note', values: [] })]);
    expect(() =>
      service.forPatch([field('size', PropertyKind.TEXT, true, false)], [assignment('size')], 'variant blue'),
    ).toThrow(BadRequestException);
  });
});

function assignment(propertyCode: string, value?: Partial<PropertyValueCommand>): PropertyAssignmentCommand {
  return plainToInstance(PropertyAssignmentCommand, {
    propertyCode,
    values: value === undefined ? [] : [plainToInstance(PropertyValueCommand, value)],
  });
}

function field(
  propertyCode: string,
  propertyKind: PropertyKind,
  required: boolean,
  multiple: boolean,
  optionCodes: string[] = [],
): TypeProductFieldModel {
  return {
    typeUuid: '00000000-0000-4000-8000-000000000001',
    propertyCode,
    propertyKind,
    required,
    multiple,
    sortOrder: 0,
    property: {
      code: propertyCode,
      name: propertyCode,
      description: null,
      kind: propertyKind,
      unitCode: null,
      unit: null,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      options: optionCodes.map((code) => ({ propertyCode, code, name: code, sortOrder: 0, extras: [] })),
    },
  } as unknown as TypeProductFieldModel;
}
