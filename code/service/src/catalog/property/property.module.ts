import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ImageModel } from '../image/infrastructure/persistence/model/image.model';
import { UnitModel } from '../unit/unit.model';
import { PropertyController } from './controller/property.controller';
import { PropertyCommandMapper } from './controller/mapper/property-command.mapper';
import { PropertyOptionExtraModel } from './property-option-extra.model';
import { PropertyOptionModel } from './property-option.model';
import { PropertyModel } from './property.model';
import { PropertyRepository } from './repository/property.repository';
import { PropertyService } from './service/property.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PropertyModel, PropertyOptionModel, PropertyOptionExtraModel, UnitModel, ImageModel]),
  ],
  controllers: [PropertyController],
  providers: [PropertyCommandMapper, PropertyRepository, PropertyService],
  exports: [PropertyService, PropertyRepository, TypeOrmModule],
})
export class PropertyModule {}
