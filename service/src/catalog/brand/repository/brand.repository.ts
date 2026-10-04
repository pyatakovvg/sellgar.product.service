import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';
import { ImageModel } from '../../image/infrastructure/persistence/model/image.model';
import { BrandImageModel } from '../brand-image.model';
import { BrandModel } from '../brand.model';
import { BrandImageCommand } from '../service/command/brand-image.command';

@Injectable()
export class BrandRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getAll(limit: number, offset: number) {
    const [items, total] = await this.dataSource.getRepository(BrandModel).findAndCount({
      order: { code: 'ASC' },
      take: limit,
      skip: offset,
    });
    if (items.length > 0) {
      const links = await this.dataSource.manager.find(BrandImageModel, {
        where: { brandCode: In(items.map((brand) => brand.code)) },
        relations: { image: true },
        order: { brandCode: 'ASC', sortOrder: 'ASC', imageUuid: 'ASC' },
      });
      const imagesByBrand = new Map<string, BrandImageModel[]>();
      for (const link of links) {
        const images = imagesByBrand.get(link.brandCode) ?? [];
        images.push(link);
        imagesByBrand.set(link.brandCode, images);
      }
      for (const brand of items) brand.images = imagesByBrand.get(brand.code) ?? [];
    }
    return { items, total, limit, offset };
  }

  getByCode(code: string) {
    return this.readBrand(this.dataSource.manager, code);
  }

  async create(code: string, name: string, description?: string | null, images?: BrandImageCommand[]) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.insert(BrandModel, { code, name, description: description ?? null, version: 1 });
        if (images !== undefined) await this.replaceImages(manager, code, images);
        return this.readBrand(manager, code);
      });
    } catch (error) {
      if (error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505') {
        throw new ConflictException(`Brand ${code} or its image link already exists`);
      }
      throw error;
    }
  }

  update(code: string, version: number, name?: string, description?: string | null, images?: BrandImageCommand[]) {
    return this.dataSource.transaction(async (manager) => {
      const brand = await manager.findOne(BrandModel, { where: { code }, lock: { mode: 'pessimistic_write' } });
      if (!brand) throw new NotFoundException(`Brand ${code} not found`);
      if (brand.version !== version) throw new ConflictException(`Brand ${code} was changed by another request`);

      const nextName = name ?? brand.name;
      const nextDescription = description === undefined ? brand.description : description;
      if (nextName === brand.name && nextDescription === brand.description && images === undefined) {
        return this.readBrand(manager, code);
      }
      brand.name = nextName;
      brand.description = nextDescription;
      brand.version += 1;
      await manager.save(BrandModel, brand);
      if (images !== undefined) await this.replaceImages(manager, code, images);
      return this.readBrand(manager, code);
    });
  }

  private async readBrand(manager: EntityManager, code: string) {
    const brand = await manager.findOne(BrandModel, {
      where: { code },
      relations: { images: { image: true } },
      order: { images: { sortOrder: 'ASC', imageUuid: 'ASC' } },
    });
    if (!brand) throw new NotFoundException(`Brand ${code} not found`);
    return brand;
  }

  private async replaceImages(manager: EntityManager, brandCode: string, images: BrandImageCommand[]) {
    if (images.length > 0) {
      const identifiers = images.map((image) => image.imageUuid);
      const knownImages = await manager.find(ImageModel, { where: { uuid: In(identifiers) } });
      const found = new Set(knownImages.map((image) => image.uuid));
      if (identifiers.some((uuid) => !found.has(uuid)))
        throw new NotFoundException('Some selected brand images do not exist');
    }

    await manager.delete(BrandImageModel, { brandCode });
    if (images.length > 0) {
      await manager.insert(
        BrandImageModel,
        images.map((image, index) => ({
          brandCode,
          imageUuid: image.imageUuid,
          sortOrder: image.sortOrder ?? index,
        })),
      );
    }
  }
}
