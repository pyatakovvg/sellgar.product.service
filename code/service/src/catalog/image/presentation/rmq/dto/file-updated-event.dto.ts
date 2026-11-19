import { IsInt, Max, Min } from 'class-validator';

import { FileCreatedEventDto } from './file-created-event.dto';

export class FileUpdatedEventDto extends FileCreatedEventDto {
  @IsInt()
  @Min(1)
  @Max(2147483646)
  version: number;
}
