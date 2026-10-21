import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { applyJsonSeedIfNeeded } from '../../infra/json-seed/apply-json-seed';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class JsonSeedBootstrapService implements OnModuleInit {
	private readonly logger = new Logger(JsonSeedBootstrapService.name);

	constructor(private readonly prisma: PrismaService) {}

	onModuleInit() {
		void this.ensure().catch((error) => {
			this.logger.error('JSON seed bootstrap failed', error as Error);
		});
	}

	private async ensure(): Promise<void> {
		const result = await applyJsonSeedIfNeeded(this.prisma);
		if(result.skipped) {
			this.logger.log(`JSON seed pack ${result.pack} already applied`);
			return;
		}

		this.logger.log(
			`Applied JSON seed pack ${result.pack} (${result.upserted} rows)`,
		);
	}
}
