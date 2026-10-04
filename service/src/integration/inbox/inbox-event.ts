import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class InboxEvent {
  @IsUUID()
  readonly eventUuid: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  readonly producer: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly schemaVersion: number;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly eventType: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  readonly aggregateType: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  readonly aggregateId: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  readonly aggregateVersion: number;
}
