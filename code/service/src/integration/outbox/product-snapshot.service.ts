import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, FindOptionsRelations, In } from 'typeorm';

import { ProductModel } from '../../catalog/product/product.model';

@Injectable()
export class ProductSnapshotService {
  async get(manager: EntityManager, uuid: string): Promise<ProductModel> {
    const [product] = await this.getMany(manager, [uuid]);
    return product;
  }

  async getMany(manager: EntityManager, uuids: string[]): Promise<ProductModel[]> {
    if (uuids.length === 0) return [];
    if (!manager.queryRunner?.isTransactionActive) {
      return manager.transaction('REPEATABLE READ', (transaction) => this.getMany(transaction, uuids));
    }

    const products = await manager.find(ProductModel, {
      where: { uuid: In(uuids) },
      relations: this.relations,
      relationLoadStrategy: 'query',
    });
    const byUuid = new Map(products.map((product) => [product.uuid, product]));

    return uuids.map((uuid) => {
      const product = byUuid.get(uuid);
      if (!product) throw new NotFoundException(`Product ${uuid} not found`);
      this.sortRelations(product);
      return product;
    });
  }

  private sortRelations(product: ProductModel): void {
    const byCode = (left: { propertyCode: string }, right: { propertyCode: string }) =>
      left.propertyCode.localeCompare(right.propertyCode);
    const byPosition = (left: { position: number }, right: { position: number }) => left.position - right.position;
    const byField = (
      left: { sortOrder: number; propertyCode: string },
      right: { sortOrder: number; propertyCode: string },
    ) => left.sortOrder - right.sortOrder || byCode(left, right);

    // Nested SQL order adds JOINs even with query loading. Sort the loaded collections instead.
    product.productType.productFields.sort(byField);
    product.productType.variantFields.sort(byField);
    product.properties.sort(byCode);
    for (const property of product.properties) property.values.sort(byPosition);
    product.variants.sort((left, right) => left.uuid.localeCompare(right.uuid));
    for (const variant of product.variants) {
      variant.properties.sort(byCode);
      for (const property of variant.properties) property.values.sort(byPosition);
      variant.images.sort(
        (left, right) => left.sortOrder - right.sortOrder || left.imageUuid.localeCompare(right.imageUuid),
      );
    }
  }

  private readonly relations: FindOptionsRelations<ProductModel> = {
    brand: true,
    productType: {
      productFields: { property: { options: { extras: true } } },
      variantFields: { property: { options: { extras: true } } },
    },
    properties: { values: true },
    variants: { properties: { values: true }, images: { image: true } },
  };
}
