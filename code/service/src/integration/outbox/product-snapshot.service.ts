import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, FindOptionsOrder, FindOptionsRelations, In } from 'typeorm';

import { ProductModel } from '../../catalog/product/product.model';

@Injectable()
export class ProductSnapshotService {
  async get(manager: EntityManager, uuid: string): Promise<ProductModel> {
    const product = await manager.findOne(ProductModel, {
      where: { uuid },
      relations: this.relations,
      order: this.order,
    });
    if (!product) throw new NotFoundException(`Product ${uuid} not found`);
    return product;
  }

  async getMany(manager: EntityManager, uuids: string[]): Promise<ProductModel[]> {
    if (uuids.length === 0) return [];
    const products = await manager.find(ProductModel, {
      where: { uuid: In(uuids) },
      relations: this.relations,
      order: this.order,
    });
    const byUuid = new Map(products.map((product) => [product.uuid, product]));
    return uuids.map((uuid) => {
      const product = byUuid.get(uuid);
      if (!product) throw new NotFoundException(`Product ${uuid} not found`);
      return product;
    });
  }

  readonly relations: FindOptionsRelations<ProductModel> = {
    brand: true,
    productType: {
      productFields: { property: { options: { extras: true } } },
      variantFields: { property: { options: { extras: true } } },
    },
    properties: { values: true },
    variants: { properties: { values: true }, images: { image: true } },
  };

  readonly order: FindOptionsOrder<ProductModel> = {
    productType: {
      productFields: { sortOrder: 'ASC', propertyCode: 'ASC' },
      variantFields: { sortOrder: 'ASC', propertyCode: 'ASC' },
    },
    properties: { propertyCode: 'ASC', values: { position: 'ASC' } },
    variants: {
      uuid: 'ASC',
      properties: { propertyCode: 'ASC', values: { position: 'ASC' } },
      images: { sortOrder: 'ASC', imageUuid: 'ASC' },
    },
  };
}
