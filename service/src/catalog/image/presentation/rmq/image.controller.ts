import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';

import { InvalidInboxEventError } from '../../../../integration/inbox/inbox-event.error';
import { ImageService } from '../../application/service/image.service';
import {
  ImageEventConsumerService,
  InvalidFileEventError,
} from '../../application/service/image-event-consumer.service';
import { Image } from '../../domain/image';
import { GetImageQueryDto } from './dto/get-image-query.dto';
import { ImageQueryMapper } from './mapper/image-query.mapper';

@Controller()
export class ImageController {
  private readonly logger = new Logger(ImageController.name);

  constructor(
    private readonly imageService: ImageService,
    private readonly eventConsumer: ImageEventConsumerService,
    private readonly queryMapper: ImageQueryMapper,
  ) {}

  @EventPattern('file_srv.file.create')
  create(@Payload() payload: unknown, @Ctx() context: RmqContext): Promise<void> {
    return this.consume(context, () => this.eventConsumer.created(payload));
  }

  @EventPattern('file_srv.file.update')
  update(@Payload() payload: unknown, @Ctx() context: RmqContext): Promise<void> {
    return this.consume(context, () => this.eventConsumer.updated(payload));
  }

  @MessagePattern({ cmd: 'catalog.v2.image.getByUuid' })
  async getByUuid(@Payload() dto: GetImageQueryDto): Promise<Image> {
    return this.imageService.getByUuid(await this.queryMapper.toGetByUuidQuery(dto));
  }

  private async consume(context: RmqContext, operation: () => Promise<void>): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      await operation();
      channel.ack(message);
    } catch (error) {
      const invalid = error instanceof InvalidFileEventError || error instanceof InvalidInboxEventError;
      this.logger.error(
        invalid ? error.message : 'Failed to consume file integration event',
        error instanceof Error ? error.stack : undefined,
      );
      channel.nack(message, false, !invalid);
    }
  }
}
