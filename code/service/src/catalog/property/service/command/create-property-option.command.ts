import { Type } from 'class-transformer';
import { IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

import { PropertyOptionCommand } from './property-option.command';

export class CreatePropertyOptionCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly code: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly version: number;

  @ValidateNested()
  @Type(() => PropertyOptionCommand)
  readonly option: PropertyOptionCommand;
}
