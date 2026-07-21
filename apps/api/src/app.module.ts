import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { PrismaService } from './infra/prisma/prisma.service';
import { RedisService } from './infra/redis/redis.service';
import { OpenSearchService } from './infra/opensearch/opensearch.service';

@Module({
  imports: [HealthModule, ProjectsModule],
  providers: [PrismaService, RedisService, OpenSearchService],
})
export class AppModule {}
