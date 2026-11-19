import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import * as uuid from 'uuid';
import { DataSource, EntityManager } from 'typeorm';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { BrandModel } from '../brand.model';
import { BrandImageModel } from '../brand-image.model';
import { ImageModel } from '../../image/image.model';

import { BrandImageDto, CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

import { BrandEntity } from '../brand.entity';

@Injectable()
export class BrandRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async count() {
    return await this.dataSource.createQueryBuilder().select().from(BrandModel, 'brand').getCount();
  }

  async findAll() {
    const result = await this.dataSource
      .createQueryBuilder(BrandModel, 'brand')
      .leftJoinAndSelect('brand.images', 'brandImage')
      .leftJoinAndSelect('brandImage.image', 'image')
      .orderBy('brand.createdAt', 'DESC')
      .addOrderBy('brandImage.sortOrder', 'ASC')
      .getMany();

    const resultInstance = result.map((entity) => this.toBrandEntity(entity));

    await Promise.all(resultInstance.map((entity) => validateOrReject(entity)));

    return resultInstance;
  }

  async findByUuid(uuid: string) {
    const result = await this.dataSource
      .createQueryBuilder(BrandModel, 'brand')
      .leftJoinAndSelect('brand.images', 'brandImage')
      .leftJoinAndSelect('brandImage.image', 'image')
      .where('brand.uuid = :uuid', { uuid })
      .orderBy('brandImage.sortOrder', 'ASC')
      .getOneOrFail();

    const resultInstance = this.toBrandEntity(result);

    await validateOrReject(resultInstance);

    return resultInstance;
  }

  async create(createBrandDto: CreateBrandDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const newUuid = uuid.v4();

      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(BrandModel)
        .values({
          uuid: newUuid,
          code: createBrandDto.code,
          name: createBrandDto.name,
          description: createBrandDto.description,
        })
        .execute();

      await this.syncBrandImage(runner.manager, newUuid, createBrandDto.image);

      const result = await runner.manager
        .createQueryBuilder(BrandModel, 'brand')
        .leftJoinAndSelect('brand.images', 'brandImage')
        .leftJoinAndSelect('brandImage.image', 'image')
        .where('brand.uuid = :uuid', { uuid: newUuid })
        .orderBy('brandImage.sortOrder', 'ASC')
        .getOneOrFail();

      const instanceResult = this.toBrandEntity(result);

      await validateOrReject(instanceResult);
      await runner.commitTransaction();

      return instanceResult;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async update(dto: UpdateBrandDto) {
    const runner = this.dataSource.createQueryRunner();

    await runner.connect();
    await runner.startTransaction();

    try {
      const brand = await runner.manager
        .createQueryBuilder(BrandModel, 'brand')
        .setLock('pessimistic_write')
        .where('brand.uuid = :uuid', { uuid: dto.uuid })
        .getOne();

      if (!brand) {
        throw new NotFoundException(`Brand ${dto.uuid} not found`);
      }

      if (brand.version !== dto.version) {
        throw new ConflictException(`Brand ${dto.uuid} was changed by another request`);
      }

      await runner.manager
        .createQueryBuilder()
        .update(BrandModel)
        .set({
          code: dto.code,
          name: dto.name,
          description: dto.description,
          version: () => 'version + 1',
        })
        .where('uuid = :uuid', { uuid: dto.uuid })
        .andWhere('version = :version', { version: dto.version })
        .execute();

      await this.syncBrandImage(runner.manager, dto.uuid, dto.image);

      const result = await runner.manager
        .createQueryBuilder(BrandModel, 'brand')
        .leftJoinAndSelect('brand.images', 'brandImage')
        .leftJoinAndSelect('brandImage.image', 'image')
        .where('brand.uuid = :uuid', { uuid: dto.uuid })
        .orderBy('brandImage.sortOrder', 'ASC')
        .getOneOrFail();

      const instanceResult = this.toBrandEntity(result);

      await validateOrReject(instanceResult);
      await runner.commitTransaction();

      return instanceResult;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  remove(id: number) {
    return `This action removes a #${id} category`;
  }

  private toBrandEntity(model: BrandModel) {
    const { images, ...brand } = model;

    return plainToInstance(BrandEntity, {
      ...brand,
      image: images?.[0] ?? null,
    });
  }

  private async syncBrandImage(manager: EntityManager, brandUuid: string, image?: BrandImageDto | null) {
    await manager.createQueryBuilder().delete().from(BrandImageModel).where('brand_uuid = :brandUuid', { brandUuid }).execute();

    if (!image?.imageUuid) {
      return;
    }

    await this.ensureImage(manager, image.imageUuid, image.fileName);

    await manager
      .createQueryBuilder()
      .insert()
      .into(BrandImageModel)
      .values({
        uuid: uuid.v4(),
        brandUuid,
        imageUuid: image.imageUuid,
        sortOrder: 0,
        isPrimary: true,
        alt: image.alt ?? null,
      })
      .execute();
  }

  private async ensureImage(manager: EntityManager, imageUuid: string, fileName?: string) {
    const imageExists = await manager
      .createQueryBuilder(ImageModel, 'image')
      .where('image.uuid = :uuid', { uuid: imageUuid })
      .getExists();

    if (imageExists) {
      return;
    }

    if (!fileName) {
      throw new NotFoundException(`Image ${imageUuid} not found`);
    }

    await manager
      .createQueryBuilder()
      .insert()
      .into(ImageModel)
      .values({
        uuid: imageUuid,
        fileName,
      })
      .execute();
  }
}
