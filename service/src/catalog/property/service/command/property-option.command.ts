import { PropertyOptionExtraCommand } from './property-option-extra.command';

export class PropertyOptionCommand {
  constructor(
    readonly code: string,
    readonly name: string,
    readonly sortOrder?: number,
    readonly extras?: PropertyOptionExtraCommand[],
  ) {}
}
