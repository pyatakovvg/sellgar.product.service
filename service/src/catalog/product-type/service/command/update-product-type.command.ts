import { ProductTypeFieldCommand } from './product-type-field.command';

export class UpdateProductTypeCommand {
  constructor(
    readonly uuid: string,
    readonly version: number,
    readonly name?: string,
    readonly productFields?: ProductTypeFieldCommand[],
    readonly variantFields?: ProductTypeFieldCommand[],
  ) {}
}
