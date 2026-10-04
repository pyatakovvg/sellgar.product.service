import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UnitService } from './service/unit.service';
import { UnitRepository } from './repository/unit.repository';
import { UnitController } from './controller/unit.controller';

import { UnitModel } from './unit.model';

@Module({
  imports: [TypeOrmModule.forFeature([UnitModel])],
  controllers: [UnitController],
  providers: [UnitService, UnitRepository],
})
export class UnitModule {}
