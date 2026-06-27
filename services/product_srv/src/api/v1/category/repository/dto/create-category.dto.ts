import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsUUID()
  @IsOptional()
  parentUuid?: string;
}
