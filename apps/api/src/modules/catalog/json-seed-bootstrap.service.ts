import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { SeedApplyStore } from 'prisma-seed-migration-sync';
import { applyJsonSeedIfNeeded } from '../../infra/json-seed/apply-json-seed';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

const REDIS_KEY = (pack: string) => `prisma-json-seed:${pack}`;

@Injectable()
export class JsonSeedBootstrapService implements OnModuleInit {
	private readonly logger = new Logger(JsonSeedBootstrapService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
	) {}

	onModuleInit() {
		void this.ensure().catch((error) => {
			this.logger.error('JSON seed bootstrap failed', error as Error);
		});
	}

	private async ensure(): Promise<void> {
		const result = await applyJsonSeedIfNeeded(this.prisma, this.store());
		if(result.skipped) {
			this.logger.log(`JSON seed pack ${result.pack} already applied`);
			return;
		}

		this.logger.log(
			`Applied JSON seed pack ${result.pack} (${result.upserted} rows)`,
		);
	}

	private store(): SeedApplyStore {
		return {
			read: async (pack) => {
				try {
					await this.connect();
					return await this.redis.client.get(REDIS_KEY(pack));
				} catch {
					return null;
				}
			},
			write: async (pack, checksum) => {
				try {
					await this.connect();
					await this.redis.client.set(REDIS_KEY(pack), checksum);
				} catch {
					this.logger.warn(`Could not cache JSON seed checksum for ${pack}`);
				}
			},
		};
	}

	private async connect(): Promise<void> {
		if(this.redis.client.status === 'wait') {
			await this.redis.client.connect();
		}
	}
}
