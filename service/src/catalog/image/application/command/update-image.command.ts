export class UpdateImageCommand {
  constructor(
    public readonly uuid: string,
    public readonly name: string,
    public readonly version: number,
  ) {}
}
