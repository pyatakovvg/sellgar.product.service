import { Type, Expose } from 'class-transformer';
import { IsUUID, IsString, IsOptional, ValidateNested, IsNumber, IsDate } from 'class-validator';
import { UnitEntity } from '@/api/v1/unit/unit.entity';

export class PropertyEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsUUID()
  @IsOptional()
  unitUuid: string | null;

  @Expose()
  @IsUUID()
  @IsOptional()
  groupUuid: string;

  @Expose()
  @IsString()
  code: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsString()
  description: string;

  @Expose()
  @IsString()
  type: 'TEXT' | 'CHECKBOX' | 'RADIO' | 'DATE' | 'RANGE';

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => UnitEntity)
  unit: UnitEntity | null;

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

export class PropertyResultEntity {
  @Expose()
  @ValidateNested()
  @Type(() => PropertyEntity)
  data: PropertyEntity[];

  @Expose()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
