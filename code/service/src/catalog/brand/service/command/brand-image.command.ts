import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class BrandImageCommand {
  @IsUUID()
  readonly imageUuid: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  readonly sortOrder?: number;
}
