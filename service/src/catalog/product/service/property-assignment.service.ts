import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { PropertyKind } from '../../property/property-kind.enum';
import { TypeProductFieldModel } from '../../product-type/type-product-field.model';
import { TypeVariantFieldModel } from '../../product-type/type-variant-field.model';
import { PropertyAssignmentCommand } from './command/property-assignment.command';
import { PropertyValueCommand } from './command/property-value.command';

type TypeField = TypeProductFieldModel | TypeVariantFieldModel;

@Injectable()
export class PropertyAssignmentService {
  forCreate(fields: TypeField[], assignments: PropertyAssignmentCommand[], owner: string): PropertyAssignmentCommand[] {
    const normalized = this.normalize(fields, assignments, owner);
    const assigned = new Set(
      normalized.filter((assignment) => assignment.values.length > 0).map((assignment) => assignment.propertyCode),
    );
    const missing = fields.filter((field) => field.required && !assigned.has(field.propertyCode));
    if (missing.length > 0) {
      throw new BadRequestException(
        `${owner} is missing required properties: ${missing.map((field) => field.propertyCode).join(', ')}`,
      );
    }
    return normalized.filter((assignment) => assignment.values.length > 0);
  }

  forPatch(fields: TypeField[], assignments: PropertyAssignmentCommand[], owner: string): PropertyAssignmentCommand[] {
    const normalized = this.normalize(fields, assignments, owner);
    for (const assignment of normalized) {
      const field = fields.find((candidate) => candidate.propertyCode === assignment.propertyCode);
      if (field === undefined)
        throw new BadRequestException(`Property ${assignment.propertyCode} is not part of ${owner} type`);
      if (field.required && assignment.values.length === 0) {
        throw new BadRequestException(`Required property ${assignment.propertyCode} cannot be cleared for ${owner}`);
      }
    }
    return normalized;
  }

  private normalize(
    fields: TypeField[],
    assignments: PropertyAssignmentCommand[],
    owner: string,
  ): PropertyAssignmentCommand[] {
    const fieldsByCode = new Map(fields.map((field) => [field.propertyCode, field]));
    const assigned = new Set<string>();
    return assignments.map((assignment) => {
      if (assigned.has(assignment.propertyCode)) {
        throw new BadRequestException(`Duplicate property ${assignment.propertyCode} for ${owner}`);
      }
      assigned.add(assignment.propertyCode);
      const field = fieldsByCode.get(assignment.propertyCode);
      if (!field) throw new BadRequestException(`Property ${assignment.propertyCode} is not part of ${owner} type`);
      if (!field.multiple && assignment.values.length > 1) {
        throw new BadRequestException(`Property ${assignment.propertyCode} accepts only one value`);
      }

      const values = assignment.values.map((value) => this.normalizeValue(field, value));
      const unique = new Set(values.map((value) => this.valueKey(field.propertyKind, value)));
      if (unique.size !== values.length) {
        throw new BadRequestException(`Property ${assignment.propertyCode} contains duplicate values`);
      }
      return plainToInstance(PropertyAssignmentCommand, {
        propertyCode: field.propertyCode,
        values,
        propertyKind: field.propertyKind,
      });
    });
  }

  private normalizeValue(field: TypeField, value: PropertyValueCommand): PropertyValueCommand {
    const entries = [
      ['valueText', value.valueText],
      ['valueInteger', value.valueInteger],
      ['valueDecimal', value.valueDecimal],
      ['valueBoolean', value.valueBoolean],
      ['valueDate', value.valueDate],
      ['valueOptionCode', value.valueOptionCode],
    ].filter((entry) => entry[1] !== undefined);
    if (entries.length !== 1) {
      throw new BadRequestException(`Property ${field.propertyCode} value must fill exactly one typed field`);
    }

    if (field.propertyKind === PropertyKind.TEXT && value.valueText !== undefined) {
      return plainToInstance(PropertyValueCommand, { valueText: value.valueText });
    }
    if (field.propertyKind === PropertyKind.INTEGER && value.valueInteger !== undefined) {
      if (!/^-?\d+$/.test(value.valueInteger))
        throw new BadRequestException(`Property ${field.propertyCode} requires an integer`);
      const integer = BigInt(value.valueInteger);
      if (integer < -9223372036854775808n || integer > 9223372036854775807n) {
        throw new BadRequestException(`Property ${field.propertyCode} integer is outside bigint range`);
      }
      return plainToInstance(PropertyValueCommand, { valueInteger: integer.toString() });
    }
    if (field.propertyKind === PropertyKind.DECIMAL && value.valueDecimal !== undefined) {
      if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value.valueDecimal)) {
        throw new BadRequestException(`Property ${field.propertyCode} requires an exact decimal`);
      }
      const unsigned = value.valueDecimal.replace('-', '');
      const [integerPart, fractionPart = ''] = unsigned.split('.');
      if (integerPart.length + fractionPart.length > 38 || fractionPart.length > 12) {
        throw new BadRequestException(`Property ${field.propertyCode} exceeds decimal(38,12)`);
      }
      return plainToInstance(PropertyValueCommand, { valueDecimal: value.valueDecimal });
    }
    if (field.propertyKind === PropertyKind.BOOLEAN && value.valueBoolean !== undefined) {
      return plainToInstance(PropertyValueCommand, { valueBoolean: value.valueBoolean });
    }
    if (field.propertyKind === PropertyKind.DATE && value.valueDate !== undefined) {
      const date = new Date(`${value.valueDate}T00:00:00.000Z`);
      if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value.valueDate) {
        throw new BadRequestException(`Property ${field.propertyCode} requires a real calendar date`);
      }
      return plainToInstance(PropertyValueCommand, { valueDate: value.valueDate });
    }
    if (field.propertyKind === PropertyKind.OPTIONS && value.valueOptionCode !== undefined) {
      const optionExists = (field.property.options ?? []).some((option) => option.code === value.valueOptionCode);
      if (!optionExists) {
        throw new BadRequestException(
          `Option ${value.valueOptionCode} does not belong to property ${field.propertyCode}`,
        );
      }
      return plainToInstance(PropertyValueCommand, { valueOptionCode: value.valueOptionCode });
    }
    throw new BadRequestException(`Property ${field.propertyCode} requires ${field.propertyKind} value`);
  }

  private valueKey(kind: PropertyKind, value: PropertyValueCommand): string {
    return `${kind}:${value.valueText ?? value.valueInteger ?? value.valueDecimal ?? value.valueBoolean ?? value.valueDate ?? value.valueOptionCode}`;
  }
}
