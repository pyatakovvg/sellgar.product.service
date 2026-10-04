export class UpdatePropertyCommand {
  constructor(
    readonly code: string,
    readonly version: number,
    readonly name?: string,
    readonly description?: string | null,
  ) {}
}
