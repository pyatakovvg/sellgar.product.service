import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsRelations, In, QueryFailedError, SelectQueryBuilder } from 'typeorm';

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

@Injectable()
export class ProductRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getAll(
    limit: number,
    offset: number,
    status?: ProductStatus,
    typeUuid?: string,
    filters: ProductPropertyFilterCommand[] = [],
  ): Promise<{ items: ProductModel[]; total: number; limit: number; offset: number }> {
    const query = this.dataSource.getRepository(ProductModel).createQueryBuilder('product');
    if (status !== undefined) query.andWhere('product.status = :status', { status });
    if (typeUuid !== undefined) query.andWhere('product.type_uuid = :typeUuid', { typeUuid });
    filters.forEach((filter, index) => this.applyFilter(query, filter, index));
    const [headers, total] = await query.orderBy('product.code', 'ASC').take(limit).skip(offset).getManyAndCount();
    if (headers.length === 0) return { items: [], total, limit, offset };
    const loaded = await this.dataSource.getRepository(ProductModel).find({
      where: { code: In(headers.map((product) => product.code)) },
      relations: this.relations,
      order: this.order,
    });
    const byCode = new Map(loaded.map((product) => [product.code, product]));
    const items = headers.map((product) => {
      const loadedProduct = byCode.get(product.code);
      if (loadedProduct === undefined) throw new NotFoundException(`Product ${product.code} could not be loaded`);
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

    const exists = filter.level === ProductTypeFieldLevel.PRODUCT
      ? `EXISTS (SELECT 1 FROM product_property_value ${valueAlias} WHERE ${valueAlias}.product_code = product.code AND ${valueAlias}.type_uuid = product.type_uuid AND ${predicates.join(' AND ')})`
      : `EXISTS (SELECT 1 FROM variant ${variantAlias} INNER JOIN variant_property_value ${valueAlias} ON ${valueAlias}.variant_code = ${variantAlias}.code AND ${valueAlias}.type_uuid = ${variantAlias}.type_uuid WHERE ${variantAlias}.product_code = product.code AND ${predicates.join(' AND ')})`;
    query.andWhere(exists, parameters);
  }

  getByCode(code: string): Promise<ProductModel> {
    return this.read(this.dataSource.manager, code);
  }

  async create(command: CreateProductCommand): Promise<ProductModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockType(manager, command.typeUuid, command.typeVersion);
        await manager.insert(ProductModel, {
          code: command.code,
          typeUuid: command.typeUuid,
          name: command.name,
          description: command.description,
          brandCode: command.brandCode,
          status: ProductStatus.ACTIVE,
          version: 1,
        });
        await this.replaceProductAssignments(manager, command.code, command.typeUuid, command.properties);
        for (const variant of command.variants) {
          await this.insertVariant(manager, command.code, command.typeUuid, variant);
        }
        return this.read(manager, command.code);
      });
    } catch (error) {
      throw this.mapWriteError(error, command.code);
    }
  }

  async update(command: UpdateProductCommand): Promise<ProductModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const product = await this.lockProduct(manager, command.code, command.version);
        await this.lockType(manager, product.typeUuid, command.typeVersion);
        const name = command.name ?? product.name;
        const description = command.description === undefined ? product.description : command.description;
        const brandCode = command.brandCode ?? product.brandCode;
        const changed = name !== product.name || description !== product.description || brandCode !== product.brandCode || command.properties !== undefined;
        if (!changed) return this.read(manager, command.code);

        product.name = name;
        product.description = description;
        product.brandCode = brandCode;
        if (command.properties !== undefined) {
          await this.patchProductAssignments(manager, product.code, product.typeUuid, command.properties);
        }
        await this.bumpProduct(manager, product);
        return this.read(manager, command.code);
      });
    } catch (error) {
      throw this.mapWriteError(error, command.code);
    }
  }

  async createVariant(
    productCode: string,
    version: number,
    typeVersion: number,
    variant: VariantInputCommand,
  ): Promise<ProductModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const product = await this.lockProduct(manager, productCode, version);
        await this.lockType(manager, product.typeUuid, typeVersion);
        await this.insertVariant(manager, product.code, product.typeUuid, variant);
        await this.bumpProduct(manager, product);
        return this.read(manager, product.code);
      });
    } catch (error) {
      throw this.mapWriteError(error, productCode);
    }
  }

  async updateVariant(command: UpdateVariantCommand): Promise<ProductModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const product = await this.lockProduct(manager, command.productCode, command.version);
        await this.lockType(manager, product.typeUuid, command.typeVersion);
        const variant = await this.lockVariant(manager, command.variantCode, product.code);
        const name = command.name ?? variant.name;
        const description = command.description === undefined ? variant.description : command.description;
        const changed = name !== variant.name || description !== variant.description || command.properties !== undefined || command.images !== undefined;
        if (!changed) return this.read(manager, product.code);

        variant.name = name;
        variant.description = description;
        await manager.save(VariantModel, variant);
        if (command.properties !== undefined) {
          await this.patchVariantAssignments(manager, variant.code, product.typeUuid, command.properties);
        }
        if (command.images !== undefined) await this.replaceVariantImages(manager, variant.code, command.images);
        await this.bumpProduct(manager, product);
        return this.read(manager, product.code);
      });
    } catch (error) {
      throw this.mapWriteError(error, command.productCode);
    }
  }

  changeProductStatus(code: string, version: number, status: ProductStatus): Promise<ProductModel> {
    return this.dataSource.transaction(async (manager) => {
      const product = await this.lockProduct(manager, code, version);
      if (product.status === status) return this.read(manager, code);
      product.status = status;
      await this.bumpProduct(manager, product);
      return this.read(manager, code);
    });
  }

  changeVariantStatus(
    productCode: string,
    variantCode: string,
    version: number,
    status: ProductStatus,
  ): Promise<ProductModel> {
    return this.dataSource.transaction(async (manager) => {
      const product = await this.lockProduct(manager, productCode, version);
      const variant = await this.lockVariant(manager, variantCode, product.code);
      if (variant.status === status) return this.read(manager, product.code);
      variant.status = status;
      await manager.save(VariantModel, variant);
      await this.bumpProduct(manager, product);
      return this.read(manager, product.code);
    });
  }

  private async insertVariant(
    manager: EntityManager,
    productCode: string,
    typeUuid: string,
    variant: VariantInputCommand,
  ): Promise<void> {
    await manager.insert(VariantModel, {
      code: variant.code,
      productCode,
      typeUuid,
      name: variant.name,
      description: variant.description ?? null,
      status: ProductStatus.ACTIVE,
    });
    await this.replaceVariantAssignments(manager, variant.code, typeUuid, variant.properties ?? []);
    await this.replaceVariantImages(manager, variant.code, variant.images ?? []);
  }

  private async patchProductAssignments(
    manager: EntityManager,
    productCode: string,
    typeUuid: string,
    assignments: PropertyAssignmentCommand[],
  ): Promise<void> {
    for (const assignment of assignments) {
      await manager.delete(ProductPropertyModel, { productCode, typeUuid, propertyCode: assignment.propertyCode });
      if (assignment.values.length > 0) await this.insertProductAssignment(manager, productCode, typeUuid, assignment);
    }
  }

  private async replaceProductAssignments(
    manager: EntityManager,
    productCode: string,
    typeUuid: string,
    assignments: PropertyAssignmentCommand[],
  ): Promise<void> {
    await manager.delete(ProductPropertyModel, { productCode, typeUuid });
    for (const assignment of assignments) await this.insertProductAssignment(manager, productCode, typeUuid, assignment);
  }

  private async insertProductAssignment(
    manager: EntityManager,
    productCode: string,
    typeUuid: string,
    assignment: PropertyAssignmentCommand,
  ): Promise<void> {
    const propertyKind = this.requirePropertyKind(assignment);
    await manager.insert(ProductPropertyModel, {
      productCode,
      typeUuid,
      propertyCode: assignment.propertyCode,
      propertyKind,
    });
    await manager.insert(ProductPropertyValueModel, assignment.values.map((value, position) => ({
      productCode,
      typeUuid,
      propertyCode: assignment.propertyCode,
      propertyKind,
      position,
      ...this.valueColumns(value),
    })));
  }

  private async patchVariantAssignments(
    manager: EntityManager,
    variantCode: string,
    typeUuid: string,
    assignments: PropertyAssignmentCommand[],
  ): Promise<void> {
    for (const assignment of assignments) {
      await manager.delete(VariantPropertyModel, { variantCode, typeUuid, propertyCode: assignment.propertyCode });
      if (assignment.values.length > 0) await this.insertVariantAssignment(manager, variantCode, typeUuid, assignment);
    }
  }

  private async replaceVariantAssignments(
    manager: EntityManager,
    variantCode: string,
    typeUuid: string,
    assignments: PropertyAssignmentCommand[],
  ): Promise<void> {
    await manager.delete(VariantPropertyModel, { variantCode, typeUuid });
    for (const assignment of assignments) await this.insertVariantAssignment(manager, variantCode, typeUuid, assignment);
  }

  private async insertVariantAssignment(
    manager: EntityManager,
    variantCode: string,
    typeUuid: string,
    assignment: PropertyAssignmentCommand,
  ): Promise<void> {
    const propertyKind = this.requirePropertyKind(assignment);
    await manager.insert(VariantPropertyModel, {
      variantCode,
      typeUuid,
      propertyCode: assignment.propertyCode,
      propertyKind,
    });
    await manager.insert(VariantPropertyValueModel, assignment.values.map((value, position) => ({
      variantCode,
      typeUuid,
      propertyCode: assignment.propertyCode,
      propertyKind,
      position,
      ...this.valueColumns(value),
    })));
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

  private async replaceVariantImages(manager: EntityManager, variantCode: string, images: VariantImageCommand[]): Promise<void> {
    if (images.length > 0) {
      const uuids = images.map((image) => image.imageUuid);
      const existing = await manager.find(ImageModel, { where: { uuid: In(uuids) } });
      const known = new Set(existing.map((image) => image.uuid));
      if (uuids.some((uuid) => !known.has(uuid))) throw new NotFoundException('Some selected variant images do not exist');
    }
    await manager.delete(VariantImageModel, { variantCode });
    if (images.length > 0) {
      await manager.insert(VariantImageModel, images.map((image, index) => ({
        variantCode,
        imageUuid: image.imageUuid,
        sortOrder: image.sortOrder ?? index,
      })));
    }
  }

  private async lockProduct(manager: EntityManager, code: string, version: number): Promise<ProductModel> {
    const product = await manager.findOne(ProductModel, { where: { code }, lock: { mode: 'pessimistic_write' } });
    if (!product) throw new NotFoundException(`Product ${code} not found`);
    if (product.version !== version) throw new ConflictException(`Product ${code} was changed by another request`);
    return product;
  }

  private async lockVariant(manager: EntityManager, code: string, productCode: string): Promise<VariantModel> {
    const variant = await manager.findOne(VariantModel, { where: { code, productCode }, lock: { mode: 'pessimistic_write' } });
    if (!variant) throw new NotFoundException(`Variant ${code} of product ${productCode} not found`);
    return variant;
  }

  private async lockType(manager: EntityManager, uuid: string, version: number): Promise<void> {
    const productType = await manager.findOne(ProductTypeModel, { where: { uuid }, lock: { mode: 'pessimistic_read' } });
    if (!productType) throw new NotFoundException(`Product type ${uuid} not found`);
    if (productType.version !== version) throw new ConflictException(`Product type ${uuid} was changed while editing`);
  }

  private async bumpProduct(manager: EntityManager, product: ProductModel): Promise<void> {
    product.version += 1;
    await manager.save(ProductModel, product);
  }

  private async read(manager: EntityManager, code: string): Promise<ProductModel> {
    const product = await manager.findOne(ProductModel, {
      where: { code },
      relations: this.relations,
      order: this.order,
    });
    if (!product) throw new NotFoundException(`Product ${code} not found`);
    return product;
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

  private readonly order = {
    productType: {
      productFields: { sortOrder: 'ASC' as const, propertyCode: 'ASC' as const },
      variantFields: { sortOrder: 'ASC' as const, propertyCode: 'ASC' as const },
    },
    properties: { propertyCode: 'ASC' as const, values: { position: 'ASC' as const } },
    variants: {
      code: 'ASC' as const,
      properties: { propertyCode: 'ASC' as const, values: { position: 'ASC' as const } },
      images: { sortOrder: 'ASC' as const, imageUuid: 'ASC' as const },
    },
  };

  private mapWriteError(error: unknown, code: string): unknown {
    if (!(error instanceof QueryFailedError)) return error;
    const databaseCode = (error.driverError as { code?: string }).code;
    if (databaseCode === '23505') return new ConflictException(`Product, variant, or related code already exists for ${code}`);
    if (databaseCode === '23503') return new BadRequestException(`Product ${code} references an unknown type, brand, field, option, or image`);
    if (databaseCode === '23514' || databaseCode === '22003') return new BadRequestException(`Product ${code} contains an invalid property value`);
    return error;
  }
}
