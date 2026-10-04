import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

import { ProductTypeRepository } from '../../product-type/repository/product-type.repository';
import { ProductEntity } from '../entity/product.entity';
import { ProductPageEntity } from '../entity/product-page.entity';
import { ProductStatus } from '../product-status.enum';
import { ProductRepository } from '../repository/product.repository';
import { CreateProductCommand } from './command/create-product.command';
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

  async getByCode(code: string): Promise<ProductEntity> {
    return ProductEntity.fromModel(await this.repository.getByCode(code));
  }

  async create(command: CreateProductCommand): Promise<ProductEntity> {
    if (command.variants.length === 0) throw new BadRequestException('Product requires at least one variant');
    const productType = await this.productTypeRepository.getByUuid(command.typeUuid);
    this.assertTypeVersion(productType.version, command.typeVersion);
    const productProperties = this.assignmentService.forCreate(
      productType.productFields,
      command.properties,
      `product ${command.code}`,
    );
    const variantCodes = new Set<string>();
    const variants = command.variants.map((variant) => {
      if (variantCodes.has(variant.code)) throw new BadRequestException(`Duplicate variant code ${variant.code}`);
      variantCodes.add(variant.code);
      return new VariantInputCommand(
        variant.code,
        variant.name,
        variant.description,
        this.assignmentService.forCreate(productType.variantFields, variant.properties ?? [], `variant ${variant.code}`),
        this.normalizeImages(variant.images ?? []),
      );
    });
    return ProductEntity.fromModel(await this.repository.create(new CreateProductCommand(
      command.code,
      command.typeUuid,
      command.typeVersion,
      command.name,
      command.brandCode,
      command.description,
      productProperties,
      variants,
    )));
  }

  async update(command: UpdateProductCommand): Promise<ProductEntity> {
    const product = await this.repository.getByCode(command.code);
    this.assertTypeVersion(product.productType.version, command.typeVersion);
    const properties = command.properties === undefined
      ? undefined
      : this.assignmentService.forPatch(product.productType.productFields, command.properties, `product ${command.code}`);
    return ProductEntity.fromModel(await this.repository.update(new UpdateProductCommand(
      command.code,
      command.version,
      command.typeVersion,
      command.name,
      command.description,
      command.brandCode,
      properties,
    )));
  }

  async createVariant(
    productCode: string,
    version: number,
    typeVersion: number,
    variant: VariantInputCommand,
  ): Promise<ProductEntity> {
    const product = await this.repository.getByCode(productCode);
    this.assertTypeVersion(product.productType.version, typeVersion);
    const normalized = new VariantInputCommand(
      variant.code,
      variant.name,
      variant.description,
      this.assignmentService.forCreate(product.productType.variantFields, variant.properties ?? [], `variant ${variant.code}`),
      this.normalizeImages(variant.images ?? []),
    );
    return ProductEntity.fromModel(await this.repository.createVariant(productCode, version, typeVersion, normalized));
  }

  async updateVariant(command: UpdateVariantCommand): Promise<ProductEntity> {
    const product = await this.repository.getByCode(command.productCode);
    this.assertTypeVersion(product.productType.version, command.typeVersion);
    const properties = command.properties === undefined
      ? undefined
      : this.assignmentService.forPatch(product.productType.variantFields, command.properties, `variant ${command.variantCode}`);
    const images = command.images === undefined
      ? undefined
      : this.normalizeImages(command.images);
    return ProductEntity.fromModel(await this.repository.updateVariant(new UpdateVariantCommand(
      command.productCode,
      command.variantCode,
      command.version,
      command.typeVersion,
      command.name,
      command.description,
      properties,
      images,
    )));
  }

  async archive(code: string, version: number): Promise<ProductEntity> {
    return ProductEntity.fromModel(await this.repository.changeProductStatus(code, version, ProductStatus.ARCHIVED));
  }

  async restore(code: string, version: number): Promise<ProductEntity> {
    return ProductEntity.fromModel(await this.repository.changeProductStatus(code, version, ProductStatus.ACTIVE));
  }

  async archiveVariant(productCode: string, variantCode: string, version: number): Promise<ProductEntity> {
    return ProductEntity.fromModel(
      await this.repository.changeVariantStatus(productCode, variantCode, version, ProductStatus.ARCHIVED),
    );
  }

  async restoreVariant(productCode: string, variantCode: string, version: number): Promise<ProductEntity> {
    return ProductEntity.fromModel(
      await this.repository.changeVariantStatus(productCode, variantCode, version, ProductStatus.ACTIVE),
    );
  }

  private normalizeImages(images: VariantImageCommand[]): VariantImageCommand[] {
    const uuids = new Set<string>();
    return images.map((image, index) => {
      const uuid = image.imageUuid.toLowerCase();
      if (uuids.has(uuid)) throw new BadRequestException(`Duplicate variant image ${image.imageUuid}`);
      uuids.add(uuid);
      return new VariantImageCommand(uuid, image.sortOrder ?? index);
    });
  }

  private assertTypeVersion(actual: number, expected: number): void {
    if (actual !== expected) throw new ConflictException('Product type was changed while editing');
  }
}
