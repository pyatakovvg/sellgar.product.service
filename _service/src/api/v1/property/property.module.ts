import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PropertyService } from './service/property.service';
import { PropertyRepository } from './repository/property.repository';
import { PropertyController } from './controller/property.controller';

import { PropertyModel } from './property.model';
import { PropertyOptionModel } from './property-option.model';
import { PropertyOptionMetadataModel } from './property-option-metadata.model';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyModel, PropertyOptionModel, PropertyOptionMetadataModel])],
  controllers: [PropertyController],
  providers: [PropertyService, PropertyRepository],
})
export class PropertyModule {}
