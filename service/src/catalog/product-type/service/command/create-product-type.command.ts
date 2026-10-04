import { ProductTypeFieldCommand } from './product-type-field.command';

export class CreateProductTypeCommand {
  constructor(
    readonly name: string,
    readonly productFields?: ProductTypeFieldCommand[],
    readonly variantFields?: ProductTypeFieldCommand[],
  ) {}
}
