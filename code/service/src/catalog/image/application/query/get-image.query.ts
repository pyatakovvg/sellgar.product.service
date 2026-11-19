import { IsUUID } from 'class-validator';

export class GetImageQuery {
  @IsUUID()
  readonly uuid: string;
}
