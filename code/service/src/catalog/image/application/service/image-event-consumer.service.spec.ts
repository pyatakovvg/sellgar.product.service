import { InboxEvent } from '../../../../integration/inbox/inbox-event';
import { InboxService } from '../../../../integration/inbox/inbox.service';
import { ProductOutboxService } from '../../../../integration/outbox/product-outbox.service';
import { Image } from '../../domain/image';
import { ImageProjectionWriter } from '../../infrastructure/persistence/image-projection.writer';
import { ImageEventConsumerService, InvalidFileEventError } from './image-event-consumer.service';

describe(ImageEventConsumerService.name, () => {
  const manager = { query: jest.fn() };
  const inbox = { consume: jest.fn() };
  const projectionWriter = { insertIfAbsent: jest.fn(), upsertIfNewer: jest.fn() };
  const productOutbox = { touchByImage: jest.fn() };
  const service = new ImageEventConsumerService(
    inbox as unknown as InboxService,
    projectionWriter as unknown as ImageProjectionWriter,
    productOutbox as unknown as ProductOutboxService,
  );
  const imageUuid = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    inbox.consume.mockImplementation(async (_event, handler) => {
      await handler(manager);
      return 'processed';
    });
    productOutbox.touchByImage.mockResolvedValue([]);
  });

  it('delegates idempotency and the transactional boundary to InboxService', async () => {
    await service.created({ uuid: imageUuid, name: 'shirt.png' });

    expect(inbox.consume).toHaveBeenCalledWith(expect.any(InboxEvent), expect.any(Function));
    expect(projectionWriter.insertIfAbsent).toHaveBeenCalledWith(manager, new Image(imageUuid, 'shirt.png', 1));
    expect(productOutbox.touchByImage).toHaveBeenCalledWith(manager, imageUuid);
  });

  it('does not apply the projection when InboxService identifies a duplicate', async () => {
    inbox.consume.mockResolvedValue('duplicate');

    await service.created({ uuid: imageUuid, name: 'shirt.png' });

    expect(projectionWriter.insertIfAbsent).not.toHaveBeenCalled();
    expect(productOutbox.touchByImage).not.toHaveBeenCalled();
  });

  it('rejects an invalid external payload before opening a transaction', async () => {
    await expect(service.updated({ uuid: imageUuid, name: '', version: 1 })).rejects.toBeInstanceOf(
      InvalidFileEventError,
    );
    expect(inbox.consume).not.toHaveBeenCalled();
  });
});
