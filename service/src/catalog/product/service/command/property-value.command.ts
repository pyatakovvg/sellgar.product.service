export class PropertyValueCommand {
  constructor(
    readonly valueText?: string,
    readonly valueInteger?: string,
    readonly valueDecimal?: string,
    readonly valueBoolean?: boolean,
    readonly valueDate?: string,
    readonly valueOptionCode?: string,
  ) {}
}
