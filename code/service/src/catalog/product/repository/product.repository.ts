import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In, QueryFailedError, SelectQueryBuilder } from 'typeorm';

import { ImageModel } from '../../image/infrastructure/persistence/model/image.model';
import { ProductTypeModel } from '../../product-type/product-type.model';
import { ProductTypeFieldLevel } from '../../product-type/product-type-field-level.enum';
import { CreateProductCommand } from '../service/command/create-product.command';
import { PropertyAssignmentCommand } from '../service/command/property-assignment.command';
import { ProductPropertyFilterCommand } from '../service/command/product-property-filter.command';
import { PropertyValueCommand } from '../service/command/property-value.command';
import { UpdateProductCommand } from '../service/command/update-product.command';
import { UpdateVariantCommand } from '../service/command/update-variant.command';
import { VariantImageCommand } from '../service/command/variant-image.command';
import { VariantInputCommand } from '../service/command/variant-input.command';
import { ProductModel } from '../product.model';
import { ProductPropertyValueModel } from '../product-property-value.model';
import { ProductPropertyModel } from '../product-property.model';
import { ProductStatus } from '../product-status.enum';
import { VariantImageModel } from '../variant-image.model';
import { VariantModel } from '../variant.model';
import { VariantPropertyValueModel } from '../variant-property-value.model';
import { VariantPropertyModel } from '../variant-property.model';
import { ProductOutboxService } from '../../../integration/outbox/product-outbox.service';
import { ProductSnapshotService } from '../../../integration/outbox/product-snapshot.service';

@Injectable()
export class ProductRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly outbox: ProductOutboxService,
    private readonly snapshots: ProductSnapshotService,
  ) {}

  async getAll(
    limit: number,
    offset: number,
    status?: ProductStatus,
    typeUuid?: string,
    filters: ProductPropertyFilterCommand[] = [],
    term?: string,
  ): Promise<{ items: ProductModel[]; total: number; limit: number; offset: number }> {
    const query = this.dataSource.getRepository(ProductModel).createQueryBuilder('product');
    if (term) {
      query.andWhere('product.search_vector @@ product_search_query(:term)', { term });
      query.addSelect('ts_rank_cd(product.search_vector, product_search_query(:term), 32)', 'search_rank');
      query.orderBy('search_rank', 'DESC').addOrderBy('product.uuid', 'ASC');
    } else {
      query.orderBy('product.uuid', 'ASC');
    }
    if (status !== undefined) query.andWhere('product.status = :status', { status });
    if (typeUuid !== undefined) query.andWhere('product.type_uuid = :typeUuid', { typeUuid });
    filters.forEach((filter, index) => this.applyFilter(query, filter, index));
    const [headers, total] = await query.take(limit).skip(offset).getManyAndCount();
    if (headers.length === 0) return { items: [], total, limit, offset };
    const loaded = await this.dataSource.getRepository(ProductModel).find({
      where: { uuid: In(headers.map((product) => product.uuid)) },
      relations: this.snapshots.relations,
      order: this.snapshots.order,
    });
    const byUuid = new Map(loaded.map((product) => [product.uuid, product]));
    const items = headers.map((product) => {
      const loadedProduct = byUuid.get(product.uuid);
      if (loadedProduct === undefined) throw new NotFoundException(`Product ${product.uuid} could not be loaded`);
      return loadedProduct;
    });
    return { items, total, limit, offset };
  }

  private applyFilter(
    query: SelectQueryBuilder<ProductModel>,
    filter: ProductPropertyFilterCommand,
    index: number,
  ): void {
    const valueAlias = `value_${index}`;
    const variantAlias = `variant_${index}`;
    const parameters: Record<string, unknown> = { [`propertyCode${index}`]: filter.propertyCode };
    const predicates = [`${valueAlias}.property_code = :propertyCode${index}`];
    if (filter.text !== undefined) {
      predicates.push(`${valueAlias}.value_text = :text${index}`);
      parameters[`text${index}`] = filter.text;
    }
    if (filter.integerFrom !== undefined) {
      predicates.push(`${valueAlias}.value_integer >= :integerFrom${index}`);
      parameters[`integerFrom${index}`] = filter.integerFrom;
    }
    if (filter.integerTo !== undefined) {
      predicates.push(`${valueAlias}.value_integer <= :integerTo${index}`);
      parameters[`integerTo${index}`] = filter.integerTo;
    }
    if (filter.decimalFrom !== undefined) {
      predicates.push(`${valueAlias}.value_decimal >= :decimalFrom${index}`);
      parameters[`decimalFrom${index}`] = filter.decimalFrom;
    }
    if (filter.decimalTo !== undefined) {
      predicates.push(`${valueAlias}.value_decimal <= :decimalTo${index}`);
      parameters[`decimalTo${index}`] = filter.decimalTo;
    }
    if (filter.boolean !== undefined) {
      predicates.push(`${valueAlias}.value_boolean = :boolean${index}`);
      parameters[`boolean${index}`] = filter.boolean;
    }
    if (filter.dateFrom !== undefined) {
      predicates.push(`${valueAlias}.value_date >= :dateFrom${index}`);
      parameters[`dateFrom${index}`] = filter.dateFrom;
    }
    if (filter.dateTo !== undefined) {
      predicates.push(`${valueAlias}.value_date <= :dateTo${index}`);
      parameters[`dateTo${index}`] = filter.dateTo;
    }
    if (filter.optionCodes !== undefined) {
      predicates.push(`${valueAlias}.value_option_code IN (:...optionCodes${index})`);
      parameters[`optionCodes${index}`] = filter.optionCodes;
    }

    const exists =
      filter.level === ProductTypeFieldLevel.PRODUCT
        ? `EXISTS (SELECT 1 FROM product_property_value ${valueAlias} WHERE ${valueAlias}.product_uuid = product.uuid AND ${valueAlias}.type_uuid = product.type_uuid AND ${predicates.join(' AND ')})`
        : `EXISTS (SELECT 1 FROM variant ${variantAlias} INNER JOIN variant_property_value ${valueAlias} ON ${valueAlias}.variant_uuid = ${variantAlias}.uuid AND ${valueAlias}.type_uuid = ${variantAlias}.type_uuid WHERE ${variantAlias}.product_uuid = product.uuid AND ${predicates.join(' AND ')})`;
    query.andWhere(exists, parameters);
  }

  getByUuid(uuid: string): Promise<ProductModel> {
    return this.read(this.dataSource.manager, uuid);
  }

  async create(command: CreateProductCommand): Promise<ProductModel> {
    const productUuid = randomUUID();
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockType(manager, command.typeUuid, command.typeVersion);
        await manager.insert(ProductModel, {
          uuid: productUuid,
          typeUuid: command.typeUuid,
          name: command.name,
          description: command.description,
          brandCode: command.brandCode,
          status: ProductStatus.ACTIVE,
          version: 1,
        });
        await this.replaceProductAssignments(manager, productUuid, command.typeUuid, command.properties);
        for (const variant of command.variants) {
          await this.insertVariant(manager, productUuid, command.typeUuid, variant);
        }
        return this.outbox.created(manager, productUuid);
      });
    } catch (error) {
      throw this.mapWriteError(error, productUuid);
    }
  }

  async update(command: UpdateProductCommand): Promise<ProductModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const typeUuid = await this.getProductTypeUuid(manager, command.uuid);
        await this.lockType(manager, typeUuid, command.typeVersion);
        const product = await this.lockProduct(manager, command.uuid, command.version);
        const name = command.name ?? product.name;
        const description = command.description === undefined ? product.description : command.description;
        const brandCode = command.brandCode ?? product.brandCode;
        const changed =
          name !== product.name ||
          description !== product.description ||
          brandCode !== product.brandCode ||
          command.properties !== undefined;
        if (!changed) return this.read(manager, command.uuid);

        product.name = name;
        product.description = description;
        product.brandCode = brandCode;
        if (command.properties !== undefined) {
          await this.patchProductAssignments(manager, product.uuid, product.typeUuid, command.properties);
        }
        await this.bumpProduct(manager, product);
        return this.outbox.updated(manager, command.uuid);
      });
    } catch (error) {
      throw this.mapWriteError(error, command.uuid);
    }
  }

  async createVariant(
    productUuid: string,
    version: number,
    typeVersion: number,
    variant: VariantInputCommand,
  ): Promise<ProductModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const typeUuid = await this.getProductTypeUuid(manager, productUuid);
        await this.lockType(manager, typeUuid, typeVersion);
        const product = await this.lockProduct(manager, productUuid, version);
        await this.insertVariant(manager, product.uuid, product.typeUuid, variant);
        await this.bumpProduct(manager, product);
        return this.outbox.updated(manager, product.uuid);
      });
    } catch (error) {
      throw this.mapWriteError(error, productUuid);
    }
  }

  async updateVariant(command: UpdateVariantCommand): Promise<ProductModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const typeUuid = await this.getProductTypeUuid(manager, command.productUuid);
        await this.lockType(manager, typeUuid, command.typeVersion);
        const product = await this.lockProduct(manager, command.productUuid, command.version);
        const variant = await this.lockVariant(manager, command.variantUuid, product.uuid);
        const name = command.name ?? variant.name;
        const description = command.description === undefined ? variant.description : command.description;
        const changed =
          name !== variant.name ||
          description !== variant.description ||
          command.properties !== undefined ||
          command.images !== undefined;
        if (!changed) return this.read(manager, product.uuid);

        variant.name = name;
        variant.description = description;
        await manager.save(VariantModel, variant);
        if (command.properties !== undefined) {
          await this.patchVariantAssignments(manager, variant.uuid, product.typeUuid, command.properties);
        }
        if (command.images !== undefined) await this.replaceVariantImages(manager, variant.uuid, command.images);
        await this.bumpProduct(manager, product);
        return this.outbox.updated(manager, product.uuid);
      });
    } catch (error) {
      throw this.mapWriteError(error, command.productUuid);
    }
  }

  changeProductStatus(uuid: string, version: number, status: ProductStatus): Promise<ProductModel> {
    return this.dataSource.transaction(async (manager) => {
      const product = await this.lockProduct(manager, uuid, version);
      if (product.status === status) return this.read(manager, uuid);
      product.status = status;
      await this.bumpProduct(manager, product);
      return this.outbox.updated(manager, uuid);
    });
  }

  changeVariantStatus(
    productUuid: string,
    variantUuid: string,
    version: number,
    status: ProductStatus,
  ): Promise<ProductModel> {
    return this.dataSource.transaction(async (manager) => {
      const product = await this.lockProduct(manager, productUuid, version);
      const variant = await this.lockVariant(manager, variantUuid, product.uuid);
      if (variant.status === status) return this.read(manager, product.uuid);
      variant.status = status;
      await manager.save(VariantModel, variant);
      await this.bumpProduct(manager, product);
      return this.outbox.updated(manager, product.uuid);
    });
  }

  private async insertVariant(
    manager: EntityManager,
    productUuid: string,
    typeUuid: string,
    variant: VariantInputCommand,
  ): Promise<void> {
    const variantUuid = randomUUID();
    await manager.insert(VariantModel, {
      uuid: variantUuid,
      productUuid,
      typeUuid,
      name: variant.name,
      description: variant.description ?? null,
      status: ProductStatus.ACTIVE,
    });
    await this.replaceVariantAssignments(manager, variantUuid, typeUuid, variant.properties ?? []);
    await this.replaceVariantImages(manager, variantUuid, variant.images ?? []);
  }

  private async patchProductAssignments(
    manager: EntityManager,
    productUuid: string,
    typeUuid: string,
    assignments: PropertyAssignmentCommand[],
  ): Promise<void> {
    for (const assignment of assignments) {
      await manager.delete(ProductPropertyModel, { productUuid, typeUuid, propertyCode: assignment.propertyCode });
      if (assignment.values.length > 0) await this.insertProductAssignment(manager, productUuid, typeUuid, assignment);
    }
  }

  private async replaceProductAssignments(
    manager: EntityManager,
    productUuid: string,
    typeUuid: string,
    assignments: PropertyAssignmentCommand[],
  ): Promise<void> {
    await manager.delete(ProductPropertyModel, { productUuid, typeUuid });
    for (const assignment of assignments)
      await this.insertProductAssignment(manager, productUuid, typeUuid, assignment);
  }

  private async insertProductAssignment(
    manager: EntityManager,
    productUuid: string,
    typeUuid: string,
    assignment: PropertyAssignmentCommand,
  ): Promise<void> {
    const propertyKind = this.requirePropertyKind(assignment);
    await manager.insert(ProductPropertyModel, {
      productUuid,
      typeUuid,
      propertyCode: assignment.propertyCode,
      propertyKind,
    });
    await manager.insert(
      ProductPropertyValueModel,
      assignment.values.map((value, position) => ({
        productUuid,
        typeUuid,
        propertyCode: assignment.propertyCode,
        propertyKind,
        position,
        ...this.valueColumns(value),
      })),
    );
  }

  private async patchVariantAssignments(
    manager: EntityManager,
    variantUuid: string,
    typeUuid: string,
    assignments: PropertyAssignmentCommand[],
  ): Promise<void> {
    for (const assignment of assignments) {
      await manager.delete(VariantPropertyModel, { variantUuid, typeUuid, propertyCode: assignment.propertyCode });
      if (assignment.values.length > 0) await this.insertVariantAssignment(manager, variantUuid, typeUuid, assignment);
    }
  }

  private async replaceVariantAssignments(
    manager: EntityManager,
    variantUuid: string,
    typeUuid: string,
    assignments: PropertyAssignmentCommand[],
  ): Promise<void> {
    await manager.delete(VariantPropertyModel, { variantUuid, typeUuid });
    for (const assignment of assignments)
      await this.insertVariantAssignment(manager, variantUuid, typeUuid, assignment);
  }

  private async insertVariantAssignment(
    manager: EntityManager,
    variantUuid: string,
    typeUuid: string,
    assignment: PropertyAssignmentCommand,
  ): Promise<void> {
    const propertyKind = this.requirePropertyKind(assignment);
    await manager.insert(VariantPropertyModel, {
      variantUuid,
      typeUuid,
      propertyCode: assignment.propertyCode,
      propertyKind,
    });
    await manager.insert(
      VariantPropertyValueModel,
      assignment.values.map((value, position) => ({
        variantUuid,
        typeUuid,
        propertyCode: assignment.propertyCode,
        propertyKind,
        position,
        ...this.valueColumns(value),
      })),
    );
  }

  private valueColumns(value: PropertyValueCommand) {
    return {
      valueText: value.valueText ?? null,
      valueInteger: value.valueInteger ?? null,
      valueDecimal: value.valueDecimal ?? null,
      valueBoolean: value.valueBoolean ?? null,
      valueDate: value.valueDate ?? null,
      valueOptionCode: value.valueOptionCode ?? null,
    };
  }

  private requirePropertyKind(assignment: PropertyAssignmentCommand) {
    if (assignment.propertyKind === undefined) {
      throw new BadRequestException(`Property ${assignment.propertyCode} was not normalized against its type`);
    }
    return assignment.propertyKind;
  }

  private async replaceVariantImages(
    manager: EntityManager,
    variantUuid: string,
    images: VariantImageCommand[],
  ): Promise<void> {
    if (images.length > 0) {
      const uuids = images.map((image) => image.imageUuid);
      const existing = await manager.find(ImageModel, { where: { uuid: In(uuids) } });
      const known = new Set(existing.map((image) => image.uuid));
      if (uuids.some((uuid) => !known.has(uuid)))
        throw new NotFoundException('Some selected variant images do not exist');
    }
    await manager.delete(VariantImageModel, { variantUuid });
    if (images.length > 0) {
      await manager.insert(
        VariantImageModel,
        images.map((image, index) => ({
          variantUuid,
          imageUuid: image.imageUuid,
          sortOrder: image.sortOrder ?? index,
        })),
      );
    }
  }

  private async lockProduct(manager: EntityManager, uuid: string, version: number): Promise<ProductModel> {
    const product = await manager.findOne(ProductModel, { where: { uuid }, lock: { mode: 'pessimistic_write' } });
    if (!product) throw new NotFoundException(`Product ${uuid} not found`);
    if (product.version !== version) throw new ConflictException(`Product ${uuid} was changed by another request`);
    return product;
  }

  private async getProductTypeUuid(manager: EntityManager, uuid: string): Promise<string> {
    const product = await manager.findOne(ProductModel, {
      where: { uuid },
      select: { typeUuid: true },
    });
    if (!product) throw new NotFoundException(`Product ${uuid} not found`);
    return product.typeUuid;
  }

  private async lockVariant(manager: EntityManager, uuid: string, productUuid: string): Promise<VariantModel> {
    const variant = await manager.findOne(VariantModel, {
      where: { uuid, productUuid },
      lock: { mode: 'pessimistic_write' },
    });
    if (!variant) throw new NotFoundException(`Variant ${uuid} of product ${productUuid} not found`);
    return variant;
  }

  private async lockType(manager: EntityManager, uuid: string, version: number): Promise<void> {
    const productType = await manager.findOne(ProductTypeModel, {
      where: { uuid },
      lock: { mode: 'pessimistic_read' },
    });
    if (!productType) throw new NotFoundException(`Product type ${uuid} not found`);
    if (productType.version !== version) throw new ConflictException(`Product type ${uuid} was changed while editing`);
  }

  private async bumpProduct(manager: EntityManager, product: ProductModel): Promise<void> {
    product.version += 1;
    await manager.save(ProductModel, product);
  }

  private async read(manager: EntityManager, uuid: string): Promise<ProductModel> {
    return this.snapshots.get(manager, uuid);
  }

  private mapWriteError(error: unknown, uuid: string): unknown {
    if (!(error instanceof QueryFailedError)) return error;
    const databaseCode = (error.driverError as { code?: string }).code;
    if (databaseCode === '23505') return new ConflictException(`Product ${uuid} contains duplicate related data`);
    if (databaseCode === '23503')
      return new BadRequestException(`Product ${uuid} references an unknown type, brand, field, option, or image`);
    if (databaseCode === '23514' || databaseCode === '22003')
      return new BadRequestException(`Product ${uuid} contains an invalid property value`);
    return error;
  }
}
