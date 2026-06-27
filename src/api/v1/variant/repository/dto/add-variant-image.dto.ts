import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class AddVariantImageDto {
  @IsUUID()
  variantUuid: string;

  @IsUUID()
  imageUuid: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsString()
  @IsOptional()
  alt?: string | null;
}
