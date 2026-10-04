import { PropertyAssignmentCommand } from './property-assignment.command';

export class UpdateProductCommand {
  constructor(
    readonly code: string,
    readonly version: number,
    readonly typeVersion: number,
    readonly name?: string,
    readonly description?: string | null,
    readonly brandCode?: string,
    readonly properties?: PropertyAssignmentCommand[],
  ) {}
}
