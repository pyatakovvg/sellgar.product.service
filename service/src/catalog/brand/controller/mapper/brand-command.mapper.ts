import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { CreateBrandCommand } from '../../service/command/create-brand.command';
import { UpdateBrandCommand } from '../../service/command/update-brand.command';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';

@Injectable()
export class BrandCommandMapper {
  toCreateCommand(dto: CreateBrandDto): Promise<CreateBrandCommand> {
    return this.transform(CreateBrandCommand, dto);
  }

  toUpdateCommand(dto: UpdateBrandDto): Promise<UpdateBrandCommand> {
    return this.transform(UpdateBrandCommand, dto);
  }

  private async transform<T extends object>(type: new () => T, source: object): Promise<T> {
    const command = plainToInstance(type, source);
    await validateOrReject(command, { whitelist: true, forbidNonWhitelisted: true });
    return command;
  }
}
