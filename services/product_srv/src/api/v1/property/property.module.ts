import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PropertyService } from './service/property.service';
import { PropertyRepository } from './repository/property.repository';
import { PropertyController } from './controller/property.controller';

import { PropertyModel } from './property.model';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyModel])],
  controllers: [PropertyController],
  providers: [PropertyService, PropertyRepository],
})
export class PropertyModule {}
