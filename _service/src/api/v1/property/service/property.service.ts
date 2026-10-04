import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreatePropertyDto } from '../repository/dto/create-property.dto';
import { UpdatePropertyDto } from '../repository/dto/update-property.dto';

import { PropertyRepository } from '../repository/property.repository';

import { PropertyResultEntity } from '../property.entity';

@Injectable()
export class PropertyService {
  constructor(private readonly propertyRepository: PropertyRepository) {}

  async findAll() {
    const result = await Promise.all([this.propertyRepository.findAll(), this.propertyRepository.count()]).then(
      ([data, count]) => {
        return {
          data: data,
          meta: {
            totalRows: count,
          },
        };
      },
    );
    const resultInstance = plainToInstance(PropertyResultEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  findByUuid(uuid: string) {
    return this.propertyRepository.findByUuid(uuid);
  }

  create(dto: CreatePropertyDto) {
    return this.propertyRepository.create(dto);
  }

  update(dto: UpdatePropertyDto) {
    return this.propertyRepository.update(dto);
  }
}
