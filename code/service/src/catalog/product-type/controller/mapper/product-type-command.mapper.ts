import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

import { CreateProductTypeCommand } from '../../service/command/create-product-type.command';
import { UpdateProductTypeCommand } from '../../service/command/update-product-type.command';
import { CreateProductTypeDto } from '../dto/create-product-type.dto';
import { UpdateProductTypeDto } from '../dto/update-product-type.dto';

@Injectable()
export class ProductTypeCommandMapper {
  async toCreateCommand(dto: CreateProductTypeDto): Promise<CreateProductTypeCommand> {
    const command = plainToInstance(CreateProductTypeCommand, dto);

    await validateOrReject(command, { whitelist: true, forbidNonWhitelisted: true });

    return command;
  }

  async toUpdateCommand(dto: UpdateProductTypeDto): Promise<UpdateProductTypeCommand> {
    const command = plainToInstance(UpdateProductTypeCommand, dto);

    await validateOrReject(command, { whitelist: true, forbidNonWhitelisted: true });

    return command;
  }
}
