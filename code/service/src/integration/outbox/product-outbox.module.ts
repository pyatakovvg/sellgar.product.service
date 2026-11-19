import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OutboxModule } from '@sellgar/outbox';

import { requiredEnvironment } from '../../database/database.options';
import { ProductOutboxService } from './product-outbox.service';
import { ProductSnapshotService } from './product-snapshot.service';

export const PRODUCT_EVENT_CLIENT = 'PRODUCT_EVENT_CLIENT';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync({
      isGlobal: true,
      clients: [{
        name: PRODUCT_EVENT_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [requiredEnvironment(process.env, 'PRODUCT_AMQP_URL')],
            queue: '',
            queueOptions: { durable: false, autoDelete: true },
            persistent: true,
            exchange: requiredEnvironment(process.env, 'PRODUCT_EVENTS_EXCHANGE'),
            exchangeType: 'topic',
            wildcards: true,
          },
        }),
      }],
    }),
    OutboxModule.forRoot({
      producer: 'product_srv_v2',
      eventClientToken: PRODUCT_EVENT_CLIENT,
    }),
  ],
  providers: [ProductSnapshotService, ProductOutboxService],
  exports: [ProductSnapshotService, ProductOutboxService],
})
export class ProductOutboxModule {}
