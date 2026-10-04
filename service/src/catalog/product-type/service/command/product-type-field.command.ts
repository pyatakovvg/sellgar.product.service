export class ProductTypeFieldCommand {
  constructor(
    readonly propertyCode: string,
    readonly required?: boolean,
    readonly multiple?: boolean,
    readonly sortOrder?: number,
  ) {}
}
