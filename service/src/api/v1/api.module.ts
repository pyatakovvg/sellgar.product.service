import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { PropertyModule } from './property/property.module';
import { PropertyGroupModule } from './property-group/property-group.module';
import { UnitModule } from './unit/unit.module';
import { BrandModule } from './brand/brand.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { VariantModule } from './variant/variant.module';
import { ImageModule } from './image/image.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ClientsModule.registerAsync({
      isGlobal: true,
      clients: [
        {
          name: 'PRODUCT_EVENT_SERVICE',
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            return {
              urls: [
                {
                  port: config.get('AMQP_PORT'),
                  hostname: config.get('AMQP_HOSTNAME'),
                  username: config.get('AMQP_USERNAME'),
                  password: config.get('AMQP_PASSWORD'),
                },
              ],
              transport: Transport.RMQ,
              options: {
                wildcards: true,
                persistent: true,
                queue: '',
                queueOptions: {
                  durable: false,
                  exclusive: false,
                  autoDelete: true,
                },
                exchange: config.get('AMQP_EVENTS_EXCHANGE'),
                exchangeType: 'topic',
              },
            };
          },
        },
      ],
    }),

    UserModule,
    ProductModule,
    VariantModule,
    PropertyGroupModule,
    PropertyModule,
    UnitModule,
    BrandModule,
    CategoryModule,
    ImageModule,
  ],
})
export class ApiV1Module {}
