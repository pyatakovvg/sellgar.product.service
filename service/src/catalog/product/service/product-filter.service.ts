import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { PropertyKind } from '../../property/property-kind.enum';
import { PropertyModel } from '../../property/property.model';
import { PropertyRepository } from '../../property/repository/property.repository';
import { ProductPropertyFilterCommand } from './command/product-property-filter.command';

@Injectable()
export class ProductFilterService {
  constructor(private readonly propertyRepository: PropertyRepository) {}

  async normalize(filters: ProductPropertyFilterCommand[]): Promise<ProductPropertyFilterCommand[]> {
    const codes = new Set<string>();
    return Promise.all(
      filters.map(async (filter) => {
        const key = `${filter.level}:${filter.propertyCode}`;
        if (codes.has(key)) throw new BadRequestException(`Duplicate product filter ${key}`);
        codes.add(key);
        const property = await this.propertyRepository.getByCode(filter.propertyCode);
        this.assertShape(property, filter);
        return plainToInstance(ProductPropertyFilterCommand, { ...filter, propertyKind: property.kind });
      }),
    );
  }

  private assertShape(property: PropertyModel, filter: ProductPropertyFilterCommand): void {
    const { kind } = property;
    const criteria = [
      filter.text,
      filter.integerFrom,
      filter.integerTo,
      filter.decimalFrom,
      filter.decimalTo,
      filter.boolean,
      filter.dateFrom,
      filter.dateTo,
      filter.optionCodes,
    ].filter((value) => value !== undefined);
    if (criteria.length === 0) throw new BadRequestException(`Filter ${filter.propertyCode} has no criterion`);

    if (kind === PropertyKind.TEXT && filter.text !== undefined && criteria.length === 1) return;
    if (kind === PropertyKind.BOOLEAN && filter.boolean !== undefined && criteria.length === 1) return;
    if (
      kind === PropertyKind.INTEGER &&
      criteria.length <= 2 &&
      (filter.integerFrom !== undefined || filter.integerTo !== undefined)
    ) {
      this.assertIntegerRange(filter);
      return;
    }
    if (
      kind === PropertyKind.DECIMAL &&
      criteria.length <= 2 &&
      (filter.decimalFrom !== undefined || filter.decimalTo !== undefined)
    ) {
      this.assertDecimalRange(filter);
      return;
    }
    if (
      kind === PropertyKind.DATE &&
      criteria.length <= 2 &&
      (filter.dateFrom !== undefined || filter.dateTo !== undefined)
    ) {
      this.assertDateRange(filter);
      return;
    }
    if (kind === PropertyKind.OPTIONS && filter.optionCodes !== undefined && criteria.length === 1) {
      const knownCodes = new Set(property.options.map((option) => option.code));
      const unknownCode = filter.optionCodes.find((code) => !knownCodes.has(code));
      if (unknownCode !== undefined) {
        throw new BadRequestException(`Option ${filter.propertyCode}/${unknownCode} not found`);
      }
      return;
    }
    throw new BadRequestException(`Filter ${filter.propertyCode} does not match property kind ${kind}`);
  }

  private assertIntegerRange(filter: ProductPropertyFilterCommand): void {
    const from = filter.integerFrom === undefined ? undefined : BigInt(filter.integerFrom);
    const to = filter.integerTo === undefined ? undefined : BigInt(filter.integerTo);
    const minimum = -9223372036854775808n;
    const maximum = 9223372036854775807n;
    if (
      (from !== undefined && (from < minimum || from > maximum)) ||
      (to !== undefined && (to < minimum || to > maximum))
    ) {
      throw new BadRequestException(`Filter ${filter.propertyCode} is outside bigint range`);
    }
    if (from !== undefined && to !== undefined && from > to) {
      throw new BadRequestException(`Filter ${filter.propertyCode} has inverted integer range`);
    }
  }

  private assertDecimalRange(filter: ProductPropertyFilterCommand): void {
    for (const value of [filter.decimalFrom, filter.decimalTo]) {
      if (value === undefined) continue;
      const unsigned = value.replace('-', '');
      const [integerPart, fractionPart = ''] = unsigned.split('.');
      if (integerPart.length + fractionPart.length > 38 || fractionPart.length > 12) {
        throw new BadRequestException(`Filter ${filter.propertyCode} exceeds decimal(38,12)`);
      }
    }
    if (filter.decimalFrom !== undefined && filter.decimalTo !== undefined) {
      const from = this.decimalAsScaledInteger(filter.decimalFrom);
      const to = this.decimalAsScaledInteger(filter.decimalTo);
      if (from > to) throw new BadRequestException(`Filter ${filter.propertyCode} has inverted decimal range`);
    }
  }

  private decimalAsScaledInteger(value: string): bigint {
    const negative = value.startsWith('-');
    const unsigned = negative ? value.slice(1) : value;
    const [integerPart, fractionPart = ''] = unsigned.split('.');
    const scaled = BigInt(`${integerPart}${fractionPart.padEnd(12, '0')}`);
    return negative ? -scaled : scaled;
  }

  private assertDateRange(filter: ProductPropertyFilterCommand): void {
    for (const value of [filter.dateFrom, filter.dateTo]) {
      if (value === undefined) continue;
      const date = new Date(`${value}T00:00:00.000Z`);
      if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
        throw new BadRequestException(`Filter ${filter.propertyCode} contains an invalid date`);
      }
    }
    if (filter.dateFrom !== undefined && filter.dateTo !== undefined && filter.dateFrom > filter.dateTo) {
      throw new BadRequestException(`Filter ${filter.propertyCode} has inverted date range`);
    }
  }
}
