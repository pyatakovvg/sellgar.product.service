import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { PaginationDto } from '../../../../common/controller/dto/pagination.dto';
import { ProductStatus } from '../../product-status.enum';
import { ProductPropertyFilterDto } from './product-property-filter.dto';

export class GetAllProductsDto extends PaginationDto {
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
