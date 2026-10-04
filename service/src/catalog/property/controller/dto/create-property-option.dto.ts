import { Type } from 'class-transformer';
import { IsInt, Max, Min, ValidateNested } from 'class-validator';

import { PropertyCodeDto } from './property-code.dto';
import { PropertyOptionDto } from './property-option.dto';

export class CreatePropertyOptionDto extends PropertyCodeDto {
  @IsInt()
  @Min(1)
  @Max(2147483647)
  version: number;

  @ValidateNested()
  @Type(() => PropertyOptionDto)
  option: PropertyOptionDto;
}
