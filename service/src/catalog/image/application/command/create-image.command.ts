export class CreateImageCommand {
  constructor(
    public readonly uuid: string,
    public readonly name: string,
  ) {}
}
