import { IsInt, IsUUID, Max, Min, ValidateIf } from 'class-validator';

export class VariantImageDto {
  @IsUUID()
  imageUuid: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;
}
