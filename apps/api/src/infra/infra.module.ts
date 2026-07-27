import { Global, Module } from '@nestjs/common';
import { MailService } from './mail/mail.service';
import { OpenSearchService } from './opensearch/opensearch.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, OpenSearchService, MailService],
  exports: [PrismaService, RedisService, OpenSearchService, MailService],
})
export class InfraModule {}