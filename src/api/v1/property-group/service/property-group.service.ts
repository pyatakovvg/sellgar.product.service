import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreatePropertyGroupDto } from '../repository/dto/create-property-group.dto';
import { UpdatePropertyGroupDto } from '../repository/dto/update-property-group.dto';

import { PropertyGroupRepository } from '../repository/property-group.repository';

import { PropertyGroupResultEntity } from '../property-group.entity';

@Injectable()
export class PropertyGroupService {
  constructor(private readonly propertyGroupRepository: PropertyGroupRepository) {}

  async findAll() {
    const result = await Promise.all([
      this.propertyGroupRepository.findAll(),
      this.propertyGroupRepository.count(),
    ]).then(([data, count]) => {
      return {
        data: data,
        meta: {
          totalRows: count,
        },
      };
    });
    const resultInstance = plainToInstance(PropertyGroupResultEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  findByUuid(uuid: string) {
    return this.propertyGroupRepository.findByUuid(uuid);
  }

  create(dto: CreatePropertyGroupDto) {
    return this.propertyGroupRepository.create(dto);
  }

  update(dto: UpdatePropertyGroupDto) {
    return this.propertyGroupRepository.update(dto);
  }
}
