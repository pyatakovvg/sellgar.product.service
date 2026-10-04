import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InboxEventModel } from './inbox-event.model';
import { InboxRepository } from './inbox.repository';
import { InboxService } from './inbox.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([InboxEventModel])],
  providers: [InboxRepository, InboxService],
  exports: [InboxService],
})
export class InboxModule {}
