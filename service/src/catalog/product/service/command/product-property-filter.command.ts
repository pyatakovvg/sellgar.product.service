import { ProductTypeFieldLevel } from '../../../product-type/product-type-field-level.enum';
import { PropertyKind } from '../../../property/property-kind.enum';

export class ProductPropertyFilterCommand {
  constructor(
    readonly level: ProductTypeFieldLevel,
    readonly propertyCode: string,
    readonly propertyKind?: PropertyKind,
    readonly text?: string,
    readonly integerFrom?: string,
    readonly integerTo?: string,
    readonly decimalFrom?: string,
    readonly decimalTo?: string,
    readonly boolean?: boolean,
    readonly dateFrom?: string,
    readonly dateTo?: string,
    readonly optionCodes?: string[],
  ) {}
}
