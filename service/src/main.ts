import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';
import { RpcHttpExceptionFilter } from './common/rpc-http-exception.filter';
import { requiredEnvironment } from './database/database.options';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new RpcHttpExceptionFilter());

  try {
    const env = process.env;
    const url = requiredEnvironment(env, 'PRODUCT_AMQP_URL');
    const commandQueue = requiredEnvironment(env, 'PRODUCT_V2_COMMAND_QUEUE');
    const eventQueue = requiredEnvironment(env, 'PRODUCT_V2_EVENT_QUEUE');
    if (commandQueue === eventQueue) throw new Error('Command and event queues must be different');

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: { urls: [url], queue: commandQueue, queueOptions: { durable: true }, persistent: true },
    }, { inheritAppConfig: true });
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [url],
        queue: eventQueue,
        queueOptions: { durable: true },
        persistent: true,
        exchange: requiredEnvironment(env, 'PRODUCT_EVENTS_EXCHANGE'),
        exchangeType: 'topic',
        wildcards: true,
      },
    }, { inheritAppConfig: true });

    await app.init();
    await app.startAllMicroservices();
    Logger.log('Product service v2 started', 'Bootstrap');
  } catch (error) {
    await app.close();
    throw error;
  }
}

void bootstrap().catch((error: unknown) => {
  // Do not log connection settings or credentials from driver error objects.
  Logger.error(error instanceof Error ? error.name : 'BootstrapError', 'Product service failed to start');
  process.exitCode = 1;
});
