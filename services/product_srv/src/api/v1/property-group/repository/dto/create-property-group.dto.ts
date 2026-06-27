import { IsString } from 'class-validator';

export class CreatePropertyGroupDto {
  @IsString()
  name: string;

  @IsString()
  description: string;
}
