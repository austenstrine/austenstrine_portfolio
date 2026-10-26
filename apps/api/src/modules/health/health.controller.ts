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
		const redis = await Promise.race([
			this.redisService.ping().catch(() => false),
			new Promise<false>((resolve) => {
				setTimeout(() => resolve(false), 800);
			}),
		]);
		const opensearch = await Promise.race([
			this.openSearchService.ping().catch(() => false),
			new Promise<false>((resolve) => {
				setTimeout(() => resolve(false), 800);
			}),
		]);

		return {
			status: 'ok',
			services: {
				redis,
				opensearch,
			},
		};
	}
}
