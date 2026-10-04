import { PropertyAssignmentCommand } from './property-assignment.command';
import { VariantInputCommand } from './variant-input.command';

export class CreateProductCommand {
  constructor(
    readonly code: string,
    readonly typeUuid: string,
    readonly typeVersion: number,
    readonly name: string,
    readonly brandCode: string,
    readonly description: string | null,
    readonly properties: PropertyAssignmentCommand[],
    readonly variants: VariantInputCommand[],
  ) {}
}
