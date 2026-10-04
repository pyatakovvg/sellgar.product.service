import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { ProductTypeRepository } from '../../product-type/repository/product-type.repository';
import { ProductEntity } from '../entity/product.entity';
import { ProductPageEntity } from '../entity/product-page.entity';
import { ProductStatus } from '../product-status.enum';
import { ProductRepository } from '../repository/product.repository';
import { CreateProductCommand } from './command/create-product.command';
import { CreateVariantCommand } from './command/create-variant.command';
import { UpdateProductCommand } from './command/update-product.command';
import { UpdateVariantCommand } from './command/update-variant.command';
import { VariantImageCommand } from './command/variant-image.command';
import { VariantInputCommand } from './command/variant-input.command';
import { PropertyAssignmentService } from './property-assignment.service';
import { ProductFilterService } from './product-filter.service';
import { ProductPropertyFilterCommand } from './command/product-property-filter.command';

@Injectable()
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly productTypeRepository: ProductTypeRepository,
    private readonly assignmentService: PropertyAssignmentService,
    private readonly filterService: ProductFilterService,
  ) {}

  async getAll(
    limit: number,
    offset: number,
    status?: ProductStatus,
    typeUuid?: string,
    filters: ProductPropertyFilterCommand[] = [],
  ): Promise<ProductPageEntity> {
    const normalizedFilters = await this.filterService.normalize(filters);
    const page = await this.repository.getAll(limit, offset, status, typeUuid, normalizedFilters);
    return { ...page, items: page.items.map(ProductEntity.fromModel) };
  }

  async getByUuid(uuid: string): Promise<ProductEntity> {
    return ProductEntity.fromModel(await this.repository.getByUuid(uuid));
  }

  async create(command: CreateProductCommand): Promise<ProductEntity> {
    if (command.variants.length === 0) throw new BadRequestException('Product requires at least one variant');
    const productType = await this.productTypeRepository.getByUuid(command.typeUuid);
    this.assertTypeVersion(productType.version, command.typeVersion);
    const productProperties = this.assignmentService.forCreate(
      productType.productFields,
      command.properties,
      'product',
    );
    const variants = command.variants.map((variant, index) =>
      plainToInstance(VariantInputCommand, {
        ...variant,
        properties: this.assignmentService.forCreate(
          productType.variantFields,
          variant.properties ?? [],
          `variant ${index + 1}`,
        ),
        images: this.normalizeImages(variant.images ?? []),
      }),
    );
    const normalized = plainToInstance(CreateProductCommand, {
      ...command,
      properties: productProperties,
      variants,
    });
    return ProductEntity.fromModel(await this.repository.create(normalized));
  }

  async update(command: UpdateProductCommand): Promise<ProductEntity> {
    const product = await this.repository.getByUuid(command.uuid);
    this.assertTypeVersion(product.productType.version, command.typeVersion);
    const properties =
      command.properties === undefined
        ? undefined
        : this.assignmentService.forPatch(
            product.productType.productFields,
            command.properties,
            `product ${command.uuid}`,
          );
    const normalized = plainToInstance(UpdateProductCommand, { ...command, properties });
    return ProductEntity.fromModel(await this.repository.update(normalized));
  }

  async createVariant(command: CreateVariantCommand): Promise<ProductEntity> {
    const product = await this.repository.getByUuid(command.productUuid);
    this.assertTypeVersion(product.productType.version, command.typeVersion);
    const variant = plainToInstance(VariantInputCommand, {
      ...command.variant,
      properties: this.assignmentService.forCreate(
        product.productType.variantFields,
        command.variant.properties ?? [],
        'variant',
      ),
      images: this.normalizeImages(command.variant.images ?? []),
    });
    return ProductEntity.fromModel(
      await this.repository.createVariant(command.productUuid, command.version, command.typeVersion, variant),
    );
  }

  async updateVariant(command: UpdateVariantCommand): Promise<ProductEntity> {
    const product = await this.repository.getByUuid(command.productUuid);
    this.assertTypeVersion(product.productType.version, command.typeVersion);
    const properties =
      command.properties === undefined
        ? undefined
        : this.assignmentService.forPatch(
            product.productType.variantFields,
            command.properties,
            `variant ${command.variantUuid}`,
          );
    const images = command.images === undefined ? undefined : this.normalizeImages(command.images);
    const normalized = plainToInstance(UpdateVariantCommand, { ...command, properties, images });
    return ProductEntity.fromModel(await this.repository.updateVariant(normalized));
  }

  async archive(uuid: string, version: number): Promise<ProductEntity> {
    return ProductEntity.fromModel(await this.repository.changeProductStatus(uuid, version, ProductStatus.ARCHIVED));
  }

  async restore(uuid: string, version: number): Promise<ProductEntity> {
    return ProductEntity.fromModel(await this.repository.changeProductStatus(uuid, version, ProductStatus.ACTIVE));
  }

  async archiveVariant(productUuid: string, variantUuid: string, version: number): Promise<ProductEntity> {
    return ProductEntity.fromModel(
      await this.repository.changeVariantStatus(productUuid, variantUuid, version, ProductStatus.ARCHIVED),
    );
  }

  async restoreVariant(productUuid: string, variantUuid: string, version: number): Promise<ProductEntity> {
    return ProductEntity.fromModel(
      await this.repository.changeVariantStatus(productUuid, variantUuid, version, ProductStatus.ACTIVE),
    );
  }

  private normalizeImages(images: VariantImageCommand[]): VariantImageCommand[] {
    const uuids = new Set<string>();
    return images.map((image, index) => {
      const uuid = image.imageUuid.toLowerCase();
      if (uuids.has(uuid)) throw new BadRequestException(`Duplicate variant image ${image.imageUuid}`);
      uuids.add(uuid);
      return plainToInstance(VariantImageCommand, { imageUuid: uuid, sortOrder: image.sortOrder ?? index });
    });
  }

  private assertTypeVersion(actual: number, expected: number): void {
    if (actual !== expected) throw new ConflictException('Product type was changed while editing');
  }
}
