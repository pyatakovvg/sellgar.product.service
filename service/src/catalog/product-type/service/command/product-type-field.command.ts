import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class ProductTypeFieldCommand {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly propertyCode: string;

  @IsOptional()
  @IsBoolean()
  readonly required?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly multiple?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  readonly sortOrder?: number;
}
