import { IsUUID } from 'class-validator';

export class GetImageQueryDto {
  @IsUUID()
  uuid: string;
}
