import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service';
import { OpenSearchService } from '../../infra/opensearch/opensearch.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly redisService: RedisService,
    private readonly openSearchService: OpenSearchService,
  ) {}

  @Get()
  async check() {
    const redis = await this.redisService.ping();
    const opensearch = await this.openSearchService.ping();

    return {
      status: 'ok',
      services: {
        redis,
        opensearch,
      },
    };
  }
}
