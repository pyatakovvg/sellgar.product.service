import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StoreService } from './service/store.service';
import { StoreRepository } from './repository/store.repository';
import { StoreController } from './controller/store.controller';

import { StoreModel } from './store.model';

@Module({
  imports: [TypeOrmModule.forFeature([StoreModel])],
  controllers: [StoreController],
  providers: [StoreService, StoreRepository],
})
export class StoreModule {}
