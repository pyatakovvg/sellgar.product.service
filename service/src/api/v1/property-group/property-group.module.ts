import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PropertyGroupService } from './service/property-group.service';
import { PropertyGroupRepository } from './repository/property-group.repository';
import { PropertyGroupController } from './controller/property-group.controller';

import { PropertyGroupModel } from './property-group.model';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyGroupModel])],
  controllers: [PropertyGroupController],
  providers: [PropertyGroupService, PropertyGroupRepository],
})
export class PropertyGroupModule {}
