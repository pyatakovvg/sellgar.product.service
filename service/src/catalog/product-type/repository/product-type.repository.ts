import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In, QueryFailedError } from 'typeorm';

import { PropertyKind } from '../../property/property-kind.enum';
import { PropertyModel } from '../../property/property.model';
import { ProductTypeFieldLevel } from '../product-type-field-level.enum';
import { ProductTypeModel } from '../product-type.model';
import { CreateProductTypeCommand } from '../service/command/create-product-type.command';
import { ProductTypeFieldCommand } from '../service/command/product-type-field.command';
import { UpdateProductTypeCommand } from '../service/command/update-product-type.command';
import { TypeProductFieldModel } from '../type-product-field.model';
import { TypeVariantFieldModel } from '../type-variant-field.model';

type ProductTypeFieldModel = TypeProductFieldModel | TypeVariantFieldModel;

@Injectable()
export class ProductTypeRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getAll(limit: number, offset: number): Promise<{ items: ProductTypeModel[]; total: number; limit: number; offset: number }> {
    const [items, total] = await this.dataSource.getRepository(ProductTypeModel).findAndCount({
      relations: this.relations,
      order: this.order,
      take: limit,
      skip: offset,
    });
    return { items, total, limit, offset };
  }

  getByUuid(uuid: string): Promise<ProductTypeModel> {
    return this.read(this.dataSource.manager, uuid);
  }

  async create(dto: CreateProductTypeCommand): Promise<ProductTypeModel> {
    const uuid = randomUUID();
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.insert(ProductTypeModel, { uuid, name: dto.name, version: 1 });
        await this.insertFields(manager, uuid, ProductTypeFieldLevel.PRODUCT, dto.productFields ?? []);
        await this.insertFields(manager, uuid, ProductTypeFieldLevel.VARIANT, dto.variantFields ?? []);
        return this.read(manager, uuid);
      });
    } catch (error) {
      throw this.mapWriteError(error, uuid);
    }
  }

  async update(dto: UpdateProductTypeCommand): Promise<ProductTypeModel> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const productType = await this.lock(manager, dto.uuid, dto.version);
        let changed = false;

        if (dto.name !== undefined && dto.name !== productType.name) {
          productType.name = dto.name;
          changed = true;
        }
        if (dto.productFields !== undefined) {
          const productFieldsChanged = await this.reconcileFields(
            manager,
            dto.uuid,
            ProductTypeFieldLevel.PRODUCT,
            dto.productFields,
          );
          changed = changed || productFieldsChanged;
        }
        if (dto.variantFields !== undefined) {
          const variantFieldsChanged = await this.reconcileFields(
            manager,
            dto.uuid,
            ProductTypeFieldLevel.VARIANT,
            dto.variantFields,
          );
          changed = changed || variantFieldsChanged;
        }

        if (changed) {
          productType.version += 1;
          await manager.save(ProductTypeModel, productType);
        }
        return this.read(manager, dto.uuid);
      });
    } catch (error) {
      throw this.mapWriteError(error, dto.uuid);
    }
  }

  private async insertFields(
    manager: EntityManager,
    uuid: string,
    level: ProductTypeFieldLevel,
    fields: ProductTypeFieldCommand[],
  ): Promise<void> {
    if (fields.length === 0) return;
    const codes = fields.map((field) => field.propertyCode);
    const properties = await manager.find(PropertyModel, { where: { code: In(codes) } });
    const propertiesByCode = new Map(properties.map((property) => [property.code, property]));
    const rows = fields.map((field, index) => {
      const property = propertiesByCode.get(field.propertyCode);
      if (!property) throw new NotFoundException(`Property ${field.propertyCode} not found`);
      this.assertMultiplicity(property.kind, field.multiple ?? false, field.propertyCode);
      return {
        typeUuid: uuid,
        propertyCode: property.code,
        propertyKind: property.kind,
        required: field.required ?? false,
        multiple: field.multiple ?? false,
        sortOrder: field.sortOrder ?? index,
      };
    });
    await manager.insert(this.fieldModel(level), rows);
  }

  private async reconcileFields(
    manager: EntityManager,
    uuid: string,
    level: ProductTypeFieldLevel,
    fields: ProductTypeFieldCommand[],
  ): Promise<boolean> {
    const model = this.fieldModel(level);
    const current = await manager.find(model, {
      where: { typeUuid: uuid },
      lock: { mode: 'pessimistic_write' },
    }) as ProductTypeFieldModel[];
    const currentByCode = new Map(current.map((field) => [field.propertyCode, field]));
    const requestedCodes = new Set(fields.map((field) => field.propertyCode));
    const removedCodes = current
      .filter((field) => !requestedCodes.has(field.propertyCode))
      .map((field) => field.propertyCode);

    let changed = false;
    if (removedCodes.length > 0) {
      await manager.delete(model, { typeUuid: uuid, propertyCode: In(removedCodes) });
      changed = true;
    }
    if (fields.length === 0) return changed;

    const properties = await manager.find(PropertyModel, {
      where: { code: In(fields.map((field) => field.propertyCode)) },
    });
    const propertiesByCode = new Map(properties.map((property) => [property.code, property]));
    const inserted: Array<{
      typeUuid: string;
      propertyCode: string;
      propertyKind: PropertyKind;
      required: boolean;
      multiple: boolean;
      sortOrder: number;
    }> = [];

    for (const field of fields) {
      const property = propertiesByCode.get(field.propertyCode);
      if (!property) throw new NotFoundException(`Property ${field.propertyCode} not found`);
      const required = field.required ?? false;
      const multiple = field.multiple ?? false;
      const sortOrder = field.sortOrder ?? 0;
      this.assertMultiplicity(property.kind, multiple, field.propertyCode);

      const existing = currentByCode.get(field.propertyCode);
      if (!existing) {
        inserted.push({
          typeUuid: uuid,
          propertyCode: field.propertyCode,
          propertyKind: property.kind,
          required,
          multiple,
          sortOrder,
        });
        changed = true;
        continue;
      }
      if (existing.multiple && !multiple) {
        await this.assertNoMultipleAssignments(manager, level, uuid, field.propertyCode);
      }
      if (
        existing.required !== required ||
        existing.multiple !== multiple ||
        existing.sortOrder !== sortOrder
      ) {
        await manager.update(
          model,
          { typeUuid: uuid, propertyCode: field.propertyCode },
          { required, multiple, sortOrder },
        );
        changed = true;
      }
    }
    if (inserted.length > 0) await manager.insert(model, inserted);
    return changed;
  }

  private async lock(manager: EntityManager, uuid: string, version: number): Promise<ProductTypeModel> {
    const productType = await manager.findOne(ProductTypeModel, {
      where: { uuid },
      lock: { mode: 'pessimistic_write' },
    });
    if (!productType) throw new NotFoundException(`Product type ${uuid} not found`);
    if (productType.version !== version) {
      throw new ConflictException(`Product type ${uuid} was changed by another request`);
    }
    return productType;
  }

  private fieldModel(level: ProductTypeFieldLevel): typeof TypeProductFieldModel | typeof TypeVariantFieldModel {
    return level === ProductTypeFieldLevel.PRODUCT ? TypeProductFieldModel : TypeVariantFieldModel;
  }

  private assertMultiplicity(kind: PropertyKind, multiple: boolean, propertyCode: string): void {
    if (kind === PropertyKind.BOOLEAN && multiple) {
      throw new BadRequestException(`Boolean property ${propertyCode} cannot be multiple`);
    }
  }

  private async assertNoMultipleAssignments(
    manager: EntityManager,
    level: ProductTypeFieldLevel,
    typeUuid: string,
    propertyCode: string,
  ): Promise<void> {
    const table = level === ProductTypeFieldLevel.PRODUCT ? 'product_property_value' : 'variant_property_value';
    const owner = level === ProductTypeFieldLevel.PRODUCT ? 'product_code' : 'variant_code';
    const rows = await manager.query(
      `SELECT 1 FROM ${table} WHERE type_uuid = $1 AND property_code = $2 GROUP BY ${owner} HAVING count(*) > 1 LIMIT 1`,
      [typeUuid, propertyCode],
    ) as unknown[];
    if (rows.length > 0) {
      throw new BadRequestException(`Property ${propertyCode} still has consumers with multiple values`);
    }
  }

  private async read(manager: EntityManager, uuid: string): Promise<ProductTypeModel> {
    const productType = await manager.findOne(ProductTypeModel, {
      where: { uuid },
      relations: this.relations,
      order: this.order,
    });
    if (!productType) throw new NotFoundException(`Product type ${uuid} not found`);
    return productType;
  }

  private readonly relations = {
    productFields: { property: { options: { extras: true } } },
    variantFields: { property: { options: { extras: true } } },
  } as const;

  private readonly order = {
    productFields: {
      sortOrder: 'ASC' as const,
      propertyCode: 'ASC' as const,
      property: { options: { sortOrder: 'ASC' as const, code: 'ASC' as const, extras: { sortOrder: 'ASC' as const, type: 'ASC' as const } } },
    },
    variantFields: {
      sortOrder: 'ASC' as const,
      propertyCode: 'ASC' as const,
      property: { options: { sortOrder: 'ASC' as const, code: 'ASC' as const, extras: { sortOrder: 'ASC' as const, type: 'ASC' as const } } },
    },
  };

  private mapWriteError(error: unknown, uuid: string): unknown {
    if (!(error instanceof QueryFailedError)) return error;
    const databaseCode = (error.driverError as { code?: string }).code;
    if (databaseCode === '23505') return new ConflictException(`Product type ${uuid} already contains this property`);
    if (databaseCode === '23503') return new BadRequestException(`Product type ${uuid} references an unknown property`);
    if (databaseCode === '23514') return new BadRequestException(`Product type ${uuid} violates a field constraint`);
    return error;
  }
}
