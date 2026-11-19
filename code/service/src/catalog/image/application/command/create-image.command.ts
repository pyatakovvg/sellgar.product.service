import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateImageCommand {
  @IsUUID()
  readonly uuid: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name: string;
}
