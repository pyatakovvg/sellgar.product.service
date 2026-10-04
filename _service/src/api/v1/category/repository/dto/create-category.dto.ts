import { Type } from 'class-transformer';
import { IsUUID, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CategoryImageDto {
  @IsUUID()
  @IsOptional()
  uuid?: string;

  @IsUUID()
  @IsOptional()
  imageUuid?: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  alt?: string | null;
}

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsUUID()
  @IsOptional()
  parentUuid?: string;

  @ValidateNested()
  @Type(() => CategoryImageDto)
  @IsOptional()
  image?: CategoryImageDto | null;
}
