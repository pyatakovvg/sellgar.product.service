import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { CreatePropertyCommand } from '../../service/command/create-property.command';
import { CreatePropertyOptionCommand } from '../../service/command/create-property-option.command';
import { UpdatePropertyCommand } from '../../service/command/update-property.command';
import { UpdatePropertyOptionCommand } from '../../service/command/update-property-option.command';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { CreatePropertyOptionDto } from '../dto/create-property-option.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { UpdatePropertyOptionDto } from '../dto/update-property-option.dto';

@Injectable()
export class PropertyCommandMapper {
  toCreateCommand(dto: CreatePropertyDto): Promise<CreatePropertyCommand> {
    return this.transform(CreatePropertyCommand, dto);
  }

  toUpdateCommand(dto: UpdatePropertyDto): Promise<UpdatePropertyCommand> {
    return this.transform(UpdatePropertyCommand, dto);
  }

  toCreateOptionCommand(dto: CreatePropertyOptionDto): Promise<CreatePropertyOptionCommand> {
    return this.transform(CreatePropertyOptionCommand, dto);
  }

  toUpdateOptionCommand(dto: UpdatePropertyOptionDto): Promise<UpdatePropertyOptionCommand> {
    return this.transform(UpdatePropertyOptionCommand, dto);
  }

  private async transform<T extends object>(type: new () => T, source: object): Promise<T> {
    const command = plainToInstance(type, source);
    await validateOrReject(command, { whitelist: true, forbidNonWhitelisted: true });
    return command;
  }
}
