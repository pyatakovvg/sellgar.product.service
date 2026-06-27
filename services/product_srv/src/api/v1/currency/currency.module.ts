import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CurrencyService } from './service/currency.service';
import { CurrencyRepository } from './repository/currency.repository';
import { CurrencyController } from './controller/currency.controller';

import { CurrencyModel } from './currency.model';

@Module({
  imports: [TypeOrmModule.forFeature([CurrencyModel])],
  controllers: [CurrencyController],
  providers: [CurrencyService, CurrencyRepository],
})
export class CurrencyModule {}
