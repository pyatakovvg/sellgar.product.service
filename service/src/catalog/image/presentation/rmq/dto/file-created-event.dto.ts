import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class FileCreatedEventDto {
  @IsUUID()
  uuid: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  name: string;
}
