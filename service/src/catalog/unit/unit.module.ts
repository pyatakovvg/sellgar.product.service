import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnitController } from './controller/unit.controller';
import { UnitModel } from './unit.model';
import { UnitRepository } from './repository/unit.repository';
import { UnitService } from './service/unit.service';

@Module({
  imports: [TypeOrmModule.forFeature([UnitModel])],
  controllers: [UnitController],
  providers: [UnitRepository, UnitService],
  exports: [UnitRepository, UnitService, TypeOrmModule],
})
export class UnitModule {}
