import { Type, Expose } from 'class-transformer';
import { IsUUID, IsString, ValidateNested, IsNumber } from 'class-validator';

export class ImageEntity {
  @Expose()
  @IsUUID()
  uuid: string;

  @Expose()
  @IsNumber()
  version: number;

  @Expose()
  @IsString()
  fileName: string;
}

class MetaEntity {
  @Expose()
  @IsNumber()
  totalRows: number;
}

export class ImageResultEntity {
  @Expose()
  @ValidateNested()
  @Type(() => ImageEntity)
  data: ImageEntity[];

  @Expose()
  @ValidateNested()
  @Type(() => MetaEntity)
  meta: MetaEntity;
}
