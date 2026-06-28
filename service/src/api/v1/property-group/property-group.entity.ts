import { Type, Expose } from 'class-transformer';
import { IsUUID, IsString, ValidateNested, IsNumber, IsDate } from 'class-validator';

import { PropertyEntity } from '../property/property.entity';

export class PropertyGroupEntity {
  @IsUUID()
  @Expose()
  uuid: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsString()
  description: string;

  @Expose()
  @ValidateNested()
  @Type(() => PropertyEntity)
  properties: PropertyEntity[];

  @Expose()
  @IsDate()
  createdAt: string;

  @Expose()
  @IsDate()
  updatedAt: string;
}

class MetaEntity {
  @Expose()
  @IsNumber()
  totalRows: number;
}

export class PropertyGroupResultEntity {
  @Expose()
  @ValidateNested()
  @Type(() => PropertyGroupEntity)
  data: PropertyGroupEntity[];

  @Expose()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
