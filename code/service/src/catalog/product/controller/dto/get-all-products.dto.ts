import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';

import { PaginationDto } from '../../../../common/controller/dto/pagination.dto';
import { ProductStatus } from '../../product-status.enum';
import { ProductPropertyFilterDto } from './product-property-filter.dto';

export class GetAllProductsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  term?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @Type(() => String)
  @IsUUID()
  typeUuid?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPropertyFilterDto)
  filters?: ProductPropertyFilterDto[];
}
