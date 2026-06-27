import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { CreateDto } from './dto/create.dto';
import { UpdateDto } from './dto/update.dto';

import { CartModel } from '../cart.model';
import { CartEntity } from '../cart.entity';
import { PriceModel } from '../../price/price.model';

@Injectable()
export class CartRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  count() {
    return this.dataSource.createQueryBuilder(CartModel, 'store').getCount();
  }

  async findAll() {
    const result = await this.dataSource
      .createQueryBuilder(CartModel, 'store')
      .addSelect('current_price')
      .leftJoinAndSelect('store.prices', 'prices')
      .leftJoinAndSelect('prices.currency', 'currency')
      .leftJoinAndMapOne(
        'store.currentPrice',
        PriceModel,
        'current_price',
        'current_price.storeUuid = store.uuid AND current_price.uuid = ' +
          '(SELECT price.uuid FROM price price WHERE price.store_uuid = store.uuid ORDER BY price.created_at DESC LIMIT 1)',
      )
      .leftJoinAndSelect('current_price.currency', 'current_price_currency')
      .leftJoinAndSelect('store.variant', 'variant')
      .leftJoinAndSelect('variant.properties', 'properties')
      .leftJoinAndSelect('properties.property', 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .orderBy('store.createdAt', 'DESC')
      .addOrderBy('properties.order', 'ASC')
      .addOrderBy('prices.createdAt', 'DESC')
      .getMany();

    const resultInstance = result.map((entity) =>
      plainToInstance(CartEntity, entity, {
        strategy: 'excludeAll',
      }),
    );

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder(CartModel, 'store')
      .addSelect('current_price')
      .leftJoinAndSelect('store.prices', 'prices')
      .leftJoinAndSelect('prices.currency', 'currency')
      .leftJoinAndMapOne(
        'store.currentPrice',
        PriceModel,
        'current_price',
        'current_price.storeUuid = store.uuid AND current_price.uuid = ' +
          '(SELECT price.uuid FROM price price WHERE price.store_uuid = store.uuid ORDER BY price.created_at DESC LIMIT 1)',
      )
      .leftJoinAndSelect('current_price.currency', 'current_price_currency')
      .leftJoinAndSelect('store.variant', 'variant')
      .leftJoinAndSelect('variant.properties', 'properties')
      .leftJoinAndSelect('properties.property', 'property')
      .leftJoinAndSelect('property.unit', 'unit')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .orderBy('store.createdAt', 'DESC')
      .addOrderBy('properties.order', 'ASC')
      .addOrderBy('prices.createdAt', 'DESC')
      .where('store.uuid = :uuid', { uuid })
      .getOneOrFail();

    const resultInstance = plainToInstance(CartEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(dto: CreateDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(CartModel)
        .values({
          uuid: newUuid,
        })
        .execute();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(PriceModel)
        .values({
          storeUuid: newUuid,
          value: dto.currentPrice.value,
          currencyCode: dto.currentPrice.currencyCode,
        })
        .execute();

      const result = await runner.manager
        .createQueryBuilder(CartModel, 'store')
        .addSelect('current_price')
        .leftJoinAndSelect('store.prices', 'prices')
        .leftJoinAndSelect('prices.currency', 'currency')
        .leftJoinAndMapOne(
          'store.currentPrice',
          PriceModel,
          'current_price',
          'current_price.storeUuid = store.uuid AND current_price.uuid = ' +
            '(SELECT price.uuid FROM price price WHERE price.store_uuid = store.uuid ORDER BY price.created_at DESC LIMIT 1)',
        )
        .leftJoinAndSelect('current_price.currency', 'current_price_currency')
        .leftJoinAndSelect('store.variant', 'variant')
        .leftJoinAndSelect('variant.properties', 'properties')
        .leftJoinAndSelect('properties.property', 'property')
        .leftJoinAndSelect('property.unit', 'unit')
        .leftJoinAndSelect('variant.product', 'product')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.variants', 'variants')
        .orderBy('store.createdAt', 'DESC')
        .addOrderBy('properties.order', 'ASC')
        .addOrderBy('prices.createdAt', 'DESC')
        .where('store.uuid = :uuid', { uuid: newUuid })
        .getOneOrFail();

      const resultInstance = plainToInstance(CartEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);
      await runner.commitTransaction();

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async update(dto: UpdateDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.manager
        .createQueryBuilder()
        .update(CartModel)
        .set({
          article: dto.article,
          variantUuid: dto.variantUuid,
          count: dto.count,
          showing: dto.showing,
        })
        .where('store.uuid = :uuid', { uuid: dto.uuid })
        .execute();

      const lastPrice = await runner.manager
        .createQueryBuilder(PriceModel, 'price')
        .select()
        .where('price.storeUuid = :storeUuid')
        .andWhere(
          'price.uuid = (SELECT price.uuid FROM price price WHERE price.store_uuid = :storeUuid ORDER BY price.created_at DESC LIMIT 1)',
        )
        .setParameters({ storeUuid: dto.uuid })
        .getOne();

      if (!lastPrice || Number(lastPrice.value) !== Number(dto.currentPrice.value)) {
        await runner.manager
          .createQueryBuilder()
          .insert()
          .into(PriceModel)
          .values({
            storeUuid: dto.uuid,
            value: dto.currentPrice.value,
            currencyCode: dto.currentPrice.currencyCode,
          })
          .execute();
      }

      const result = await runner.manager
        .createQueryBuilder(CartModel, 'store')
        .addSelect('current_price')
        .leftJoinAndSelect('store.prices', 'prices')
        .leftJoinAndSelect('prices.currency', 'currency')
        .leftJoinAndMapOne(
          'store.currentPrice',
          PriceModel,
          'current_price',
          'current_price.storeUuid = store.uuid AND current_price.uuid = ' +
            '(SELECT price.uuid FROM price price WHERE price.store_uuid = store.uuid ORDER BY price.created_at DESC LIMIT 1)',
        )
        .leftJoinAndSelect('current_price.currency', 'current_price_currency')
        .leftJoinAndSelect('store.variant', 'variant')
        .leftJoinAndSelect('variant.properties', 'properties')
        .leftJoinAndSelect('properties.property', 'property')
        .leftJoinAndSelect('property.unit', 'unit')
        .leftJoinAndSelect('variant.product', 'product')
        .leftJoinAndSelect('product.brand', 'brand')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.variants', 'variants')
        .orderBy('store.createdAt', 'DESC')
        .addOrderBy('properties.order', 'ASC')
        .addOrderBy('prices.createdAt', 'DESC')
        .where('store.uuid = :uuid', { uuid: dto.uuid })
        .getOneOrFail();

      const resultInstance = plainToInstance(CartEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);
      await runner.commitTransaction();

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}
