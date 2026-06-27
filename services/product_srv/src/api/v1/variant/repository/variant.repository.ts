import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

// import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { VariantModel } from '../variant.model';
import { VariantEntity } from '../variant.entity';

@Injectable()
export class VariantRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count() {
    return this.dataSource.createQueryBuilder(VariantModel, 'variant').getCount();
  }

  async findAll() {
    const result = await this.dataSource
      .createQueryBuilder(VariantModel, 'variant')
      .leftJoinAndSelect('variant.properties', 'properties')
      .leftJoinAndSelect('properties.property', 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .orderBy('product.createdAt', 'DESC')
      .addOrderBy('variant.createdAt', 'ASC')
      .addOrderBy('properties.order', 'ASC')
      .getMany();

    const resultInstance = result.map((entity) =>
      plainToInstance(VariantEntity, entity, {
        strategy: 'excludeAll',
      }),
    );

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid() {
    // const result = await this.prismaService.productVariant.findUnique({
    //   where: {
    //     uuid,
    //   },
    //   select: this.productVariantSelect,
    // });
    // const resultInstance = plainToInstance(ProductVariantEntity, result, {
    //   strategy: 'excludeAll',
    // });
    //
    // await validateOrReject(resultInstance);
    //
    // return resultInstance;
  }

  async create() {
    // const result = await this.prismaService.product.create({
    //   data: {
    //     name: dto.name,
    //     description: dto.description,
    //     categoryUuid: dto.categoryUuid,
    //     brandUuid: dto.brandUuid,
    //     variants: {
    //       create: dto.variants.map((v) => ({
    //         name: v.name,
    //         description: v.description,
    //         prices: {
    //           create: {
    //             price: 0,
    //             currencyCode: 'RUB',
    //           },
    //         },
    //       })),
    //     },
    //   },
    //   select: this.productVariantSelect,
    // });
    // const resultInstance = plainToInstance(ProductVariantEntity, result, {
    //   strategy: 'excludeAll',
    // });
    //
    // await validateOrReject(resultInstance);
    //
    // return resultInstance;
  }

  async update() {
    // const result = await this.prismaService.product.update({
    //   where: {
    //     uuid,
    //   },
    //   data: {
    //     name: dto.name,
    //     description: dto.description,
    //     categoryUuid: dto.categoryUuid,
    //     brandUuid: dto.brandUuid,
    //     variants: {
    //       deleteMany: {
    //         NOT: dto.variants.map((v) => ({ uuid: v.uuid })),
    //       },
    //       create: dto.variants
    //         .filter((v) => !v.uuid)
    //         .map((v) => ({
    //           name: v.name,
    //           description: v.description,
    //           prices: {
    //             create: {
    //               price: v.price.price,
    //               currencyCode: 'RUB',
    //             },
    //           },
    //         })),
    //       update: dto.variants
    //         .filter((v) => !!v.uuid)
    //         .map((v) => ({
    //           where: {
    //             uuid: v.uuid,
    //           },
    //           data: {
    //             uuid: v.uuid,
    //             name: v.name,
    //             description: v.description,
    //             prices: {
    //               create: {
    //                 price: v.price.price,
    //                 currencyCode: 'RUB',
    //               },
    //             },
    //           },
    //         })),
    //     },
    //   },
    //   select: this.productVariantSelect,
    // });
    // const resultInstance = plainToInstance(ProductVariantEntity, result, {
    //   strategy: 'excludeAll',
    // });
    //
    // await validateOrReject(resultInstance);
    //
    // return resultInstance;
  }
}
