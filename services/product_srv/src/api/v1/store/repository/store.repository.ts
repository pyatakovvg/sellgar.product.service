import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';

import * as uuid from 'uuid';
import { DataSource } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { UseValidation, Validate } from '../../../../utils/validator.utils';

import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';

import { StoreModel } from '../store.model';
import { StoreEntity } from '../store.entity';
import { PriceModel } from '../../price/price.model';

@Injectable()
export class StoreRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject('PRODUCT_EVENT_SERVICE') private readonly productProxy: ClientProxy,
  ) {}

  private buildTsQuery(query: string): string {
    const cleanedQuery = query
      .trim()
      .replace(/[^\w\sа-яА-Я]/g, ' ') // Удаляем специальные символы
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .split(' ')
      .map((word) => `${word}:*`) // Добавляем префиксный поиск
      .join(' | '); // Используем or оператор

    return cleanedQuery || '';
  }

  async findAllAndCount(query: any) {
    const builder = this.dataSource
      .createQueryBuilder(StoreModel, 'store')
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
      .leftJoinAndSelect('store.shop', 'shop')
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
      .addOrderBy('prices.createdAt', 'DESC');

    if (query.search) {
      builder
        .andHaving(
          `to_tsvector(coalesce(product.name, '')) @@ to_tsquery(:query) or ` +
            `to_tsvector(coalesce(variant.name, '')) @@ to_tsquery(:query) or ` +
            `to_tsvector(coalesce(article::TEXT, '')) @@ to_tsquery(:query) or ` +
            `to_tsvector(coalesce(current_price.value::TEXT, '')) @@ to_tsquery(:query)`,
          {
            query: this.buildTsQuery(decodeURI(query.search)),
          },
        )
        .groupBy('store.uuid')
        .addGroupBy('shop.uuid')
        .addGroupBy('unit.uuid')
        .addGroupBy('brand.uuid')
        .addGroupBy('category.uuid')
        .addGroupBy('variant.uuid')
        .addGroupBy('variants.uuid')
        .addGroupBy('property.uuid')
        .addGroupBy('properties.uuid')
        .addGroupBy('product.uuid')
        .addGroupBy('currency.code')
        .addGroupBy('current_price.uuid')
        .addGroupBy('current_price_currency.code')
        .addGroupBy('prices.uuid');
    }

    const result = await builder.getManyAndCount();

    const resultInstance = result[0].map((entity) =>
      plainToInstance(StoreEntity, entity, {
        strategy: 'excludeAll',
      }),
    );

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return { data: resultInstance, count: result[1] };
  }

  async findByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder(StoreModel, 'store')
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
      .leftJoinAndSelect('store.shop', 'shop')
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

    const resultInstance = plainToInstance(StoreEntity, result, {
      strategy: 'excludeAll',
    });

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  @UseValidation()
  async create(@Validate(CreateStoreDto) dto: CreateStoreDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(StoreModel)
        .values({
          uuid: newUuid,
          article: dto.article,
          shopUuid: dto.shopUuid,
          variantUuid: dto.variantUuid,
          count: dto.count,
          showing: dto.showing,
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
        .createQueryBuilder(StoreModel, 'store')
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
        .leftJoinAndSelect('store.shop', 'shop')
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

      const resultInstance = plainToInstance(StoreEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);

      new Promise((resolve, reject) => {
        this.productProxy.emit('store.create', resultInstance).subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err),
        });
      });

      await runner.commitTransaction();

      return resultInstance;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  @UseValidation()
  async update(@Validate(UpdateStoreDto) dto: UpdateStoreDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.manager
        .createQueryBuilder()
        .update(StoreModel)
        .set({
          article: dto.article,
          shopUuid: dto.shopUuid,
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

      if (
        !lastPrice ||
        Number(lastPrice.value) !== Number(dto.currentPrice.value) ||
        lastPrice.currencyCode !== dto.currentPrice.currencyCode
      ) {
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
        .createQueryBuilder(StoreModel, 'store')
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
        .leftJoinAndSelect('store.shop', 'shop')
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

      const resultInstance = plainToInstance(StoreEntity, result, {
        strategy: 'excludeAll',
      });

      await validateOrReject(resultInstance);

      new Promise((resolve, reject) => {
        this.productProxy.emit('store.update', resultInstance).subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err),
        });
      });

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
