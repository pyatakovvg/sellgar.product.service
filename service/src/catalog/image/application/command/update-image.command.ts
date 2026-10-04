import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateImageCommand {
  @IsUUID()
  readonly uuid: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly version: number;
}
