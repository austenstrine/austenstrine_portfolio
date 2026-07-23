import { Global, Module } from '@nestjs/common';
import { OpenSearchService } from './opensearch/opensearch.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Global()
@Module({
  providers: [PrismaService, RedisService, OpenSearchService],
  exports: [PrismaService, RedisService, OpenSearchService],
})
export class InfraModule {}