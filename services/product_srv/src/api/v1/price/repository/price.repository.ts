import { Injectable } from '@nestjs/common';

import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreatePriceDto } from './dto/create-price.dto';

import { PriceEntity } from '../price.entity';

@Injectable()
export class PriceRepository {
  constructor() {}

  count(storeUuid: string) {
    // return this.prismaService.priceHistory.count({
    //   where: {
    //     storeUuid,
    //   },
    // });
  }

  async findAll(storeUuid: string) {
    // const result = await this.prismaService.priceHistory.findMany({
    //   where: {
    //     storeUuid,
    //   },
    //   orderBy: {
    //     createdAt: 'desc',
    //   },
    //   select: {
    //     uuid: true,
    //     value: true,
    //     currency: {
    //       select: {
    //         code: true,
    //         name: true,
    //         createdAt: true,
    //         updatedAt: true,
    //       },
    //     },
    //     createdAt: true,
    //   },
    // });
    // const resultInstance = result.map((item) => plainToInstance(PriceEntity, item));
    //
    // await Promise.all(resultInstance.map((instance) => validateOrReject(instance)));
    //
    // return resultInstance;
  }

  async create(storeUuid: string, dto: CreatePriceDto) {
    // const result = await this.prismaService.priceHistory.create({
    //   data: {
    //     storeUuid,
    //     value: dto.value,
    //     currencyCode: dto.currencyCode,
    //   },
    //   select: {
    //     uuid: true,
    //     value: true,
    //     currency: {
    //       select: {
    //         code: true,
    //         name: true,
    //         createdAt: true,
    //         updatedAt: true,
    //       },
    //     },
    //     createdAt: true,
    //   },
    // });
    // const instanceResult = plainToInstance(PriceEntity, result);
    //
    // await validateOrReject(instanceResult);
    //
    // return instanceResult;
  }
}
