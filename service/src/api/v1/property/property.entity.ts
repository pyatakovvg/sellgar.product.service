import { Type, Expose } from 'class-transformer';
import { IsUUID, IsString, IsOptional, ValidateNested, IsNumber, IsDate } from 'class-validator';
import { UnitEntity } from '@/api/v1/unit/unit.entity';

export class PropertyOptionMetadataEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsNumber()
  version: number;

  @Expose()
  @IsUUID()
  optionUuid: string;

  @Expose()
  @IsString()
  valueType: 'TEXT' | 'COLOR' | 'IMAGE' | 'ICON';

  @Expose()
  @IsNumber()
  sortOrder: number;

  @Expose()
  @IsString()
  @IsOptional()
  textValue: string | null;

  @Expose()
  @IsString()
  @IsOptional()
  colorValue: string | null;

  @Expose()
  @IsUUID()
  @IsOptional()
  fileUuid: string | null;

  @Expose()
  @IsString()
  @IsOptional()
  iconCode: string | null;

  @Expose()
  @IsDate()
  createdAt: string;

  @Expose()
  @IsDate()
  updatedAt: string;
}

export class PropertyOptionEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsNumber()
  version: number;

  @Expose()
  @IsUUID()
  propertyUuid: string;

  @Expose()
  @IsString()
  code: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsNumber()
  sortOrder: number;

  @Expose()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PropertyOptionMetadataEntity)
  metadata: PropertyOptionMetadataEntity[];

  @Expose()
  @IsDate()
  createdAt: string;

  @Expose()
  @IsDate()
  updatedAt: string;
}

export class PropertyEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsNumber()
  version: number;

  @Expose()
  @IsUUID()
  @IsOptional()
  unitUuid: string | null;

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
  type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'OPTION' | 'DATE';

  @Expose()
  @IsOptional()
  @ValidateNested()
  @Type(() => UnitEntity)
  unit: UnitEntity | null;

  @Expose()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PropertyOptionEntity)
  options: PropertyOptionEntity[];

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
