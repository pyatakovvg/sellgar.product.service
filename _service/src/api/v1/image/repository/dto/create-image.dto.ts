import { IsUUID, IsString } from 'class-validator';

export class CreateImageDto {
  @IsUUID()
  uuid: string;

  @IsString()
  name: string;
}
