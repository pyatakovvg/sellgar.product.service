import { PropertyKind } from '../../property-kind.enum';
import { PropertyOptionCommand } from './property-option.command';

export class CreatePropertyCommand {
  constructor(
    readonly code: string,
    readonly name: string,
    readonly kind: PropertyKind,
    readonly description?: string | null,
    readonly unitCode?: string | null,
    readonly options?: PropertyOptionCommand[],
  ) {}
}
