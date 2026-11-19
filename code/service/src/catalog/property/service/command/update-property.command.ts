import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdatePropertyCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly code: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly version: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly description?: string | null;
}
