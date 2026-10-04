import { PropertyAssignmentCommand } from './property-assignment.command';
import { VariantImageCommand } from './variant-image.command';

export class UpdateVariantCommand {
  constructor(
    readonly productCode: string,
    readonly variantCode: string,
    readonly version: number,
    readonly typeVersion: number,
    readonly name?: string,
    readonly description?: string | null,
    readonly properties?: PropertyAssignmentCommand[],
    readonly images?: VariantImageCommand[],
  ) {}
}
