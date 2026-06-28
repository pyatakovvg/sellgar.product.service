import { IsOptional, IsString, IsUUID } from 'class-validator';

import { PropertyTypeEnum } from '../../property.model';

export class CreatePropertyDto {
  @IsUUID()
  groupUuid: string;

  @IsUUID()
  @IsOptional()
  unitUuid: string | null;

  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  type: PropertyTypeEnum;
}
