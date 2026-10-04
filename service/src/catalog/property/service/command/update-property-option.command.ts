import { PropertyOptionExtraCommand } from './property-option-extra.command';

export class UpdatePropertyOptionCommand {
  constructor(
    readonly code: string,
    readonly optionCode: string,
    readonly version: number,
    readonly name?: string,
    readonly sortOrder?: number,
    readonly extras?: PropertyOptionExtraCommand[],
  ) {}
}
