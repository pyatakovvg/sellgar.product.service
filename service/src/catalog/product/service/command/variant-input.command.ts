import { PropertyAssignmentCommand } from './property-assignment.command';
import { VariantImageCommand } from './variant-image.command';

export class VariantInputCommand {
  constructor(
    readonly code: string,
    readonly name: string,
    readonly description?: string | null,
    readonly properties?: PropertyAssignmentCommand[],
    readonly images?: VariantImageCommand[],
  ) {}
}
