import { Injectable } from '@nestjs/common';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateUnitDto } from '../repository/dto/create-unit.dto';
import { UpdateUnitDto } from '../repository/dto/update-unit.dto';

import { UnitRepository } from '../repository/unit.repository';

import { UnitResultEntity } from '../unit.entity';

@Injectable()
export class UnitService {
  constructor(private readonly unitRepository: UnitRepository) {}

  async findAll() {
    const result = await Promise.all([this.unitRepository.findAll(), this.unitRepository.count()]).then(
      ([data, count]) => {
        return {
          data: data,
          meta: {
            totalRows: count,
          },
        };
      },
    );
    const resultInstance = plainToInstance(UnitResultEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  findByUuid(uuid: string) {
    return this.unitRepository.findByUuid(uuid);
  }

  create(dto: CreateUnitDto) {
    return this.unitRepository.create(dto);
  }

  update(dto: UpdateUnitDto) {
    return this.unitRepository.update(dto);
  }
}
