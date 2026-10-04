import { OutboxWriter } from '@sellgar/outbox';
import { EntityManager } from 'typeorm';

import { ProductStatus } from '../../catalog/product/product-status.enum';
import { ProductOutboxService } from './product-outbox.service';
import { ProductSnapshotService } from './product-snapshot.service';

describe(ProductOutboxService.name, () => {
  const product = {
    uuid: '11111111-1111-4111-8111-111111111111',
    typeUuid: '22222222-2222-4222-8222-222222222222',
    name: 'Shirt',
    description: null,
    brandCode: 'brand',
    status: ProductStatus.ACTIVE,
    version: 4,
    createdAt: new Date('2026-10-04T10:00:00.000Z'),
    updatedAt: new Date('2026-10-04T11:00:00.000Z'),
    properties: [],
    variants: [],
    productType: { version: 2, productFields: [], variantFields: [] },
  };
  const writer = { add: jest.fn(), addMany: jest.fn() };
  const snapshots = { get: jest.fn(), getMany: jest.fn() };
  const service = new ProductOutboxService(writer as unknown as OutboxWriter, snapshots as unknown as ProductSnapshotService);
  const manager = { query: jest.fn(), update: jest.fn() } as unknown as EntityManager;

  beforeEach(() => {
    jest.clearAllMocks();
    snapshots.get.mockResolvedValue(product);
    snapshots.getMany.mockResolvedValue([product]);
    writer.add.mockResolvedValue(undefined);
    writer.addMany.mockResolvedValue(undefined);
  });

  it('writes the complete product snapshot with the UUID and current version', async () => {
    await service.created(manager, product.uuid);

    expect(writer.add).toHaveBeenCalledWith(manager, expect.objectContaining({
      eventType: 'product.created',
      aggregateType: 'product',
      aggregateId: product.uuid,
      aggregateVersion: 4,
      schemaVersion: 3,
      payload: expect.objectContaining({ uuid: product.uuid, name: 'Shirt', variants: [] }),
    }));
  });

  it('increments affected products before writing product.updated events', async () => {
    (manager.query as jest.Mock).mockResolvedValue([{ uuid: product.uuid }]);

    await service.touchByType(manager, product.typeUuid);

    expect(manager.update).toHaveBeenCalledWith(expect.any(Function), { uuid: expect.any(Object) }, {
      version: expect.any(Function),
    });
    expect(snapshots.getMany).toHaveBeenCalledWith(manager, [product.uuid]);
    expect(writer.addMany).toHaveBeenCalledWith(manager, [expect.objectContaining({
      eventType: 'product.updated',
      aggregateId: product.uuid,
      aggregateVersion: 4,
    })]);
  });
});
