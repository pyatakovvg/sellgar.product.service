import { Type } from 'class-transformer';
import { IsInt, IsUUID, Max, Min, ValidateNested } from 'class-validator';

import { VariantInputCommand } from './variant-input.command';

export class CreateVariantCommand {
  @IsUUID()
  readonly productUuid: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly version: number;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly typeVersion: number;

  @ValidateNested()
  @Type(() => VariantInputCommand)
  readonly variant: VariantInputCommand;
}
