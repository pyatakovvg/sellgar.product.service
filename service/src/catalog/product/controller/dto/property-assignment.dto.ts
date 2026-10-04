import { Transform, Type } from 'class-transformer';
import { IsArray, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

import { trimString } from '../../../../common/transformer/trim-string.transformer';
import { PropertyValueDto } from './property-value.dto';

export class PropertyAssignmentDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  propertyCode: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyValueDto)
  values: PropertyValueDto[];
}
