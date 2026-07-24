import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
	readonly client: Redis;

	constructor() {
		this.client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
			lazyConnect: true,
			maxRetriesPerRequest: 1,
		});
	}

	async ping(): Promise<string> {
		if(this.client.status === 'wait') {
			await this.client.connect();
		}
		return this.client.ping();
	}

	async onModuleDestroy() {
		await this.client.quit();
	}
}
