import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { CatalogSearchService } from './catalog-search.service';
import { applyOutboxRows, type CatalogSearchOutboxRow } from './catalog-search.sync';

const DRAIN_MS = 250;
const BATCH = 200;

@Injectable()
export class CatalogSearchListener implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(CatalogSearchListener.name);
	private timer?: ReturnType<typeof setInterval>;
	private draining = false;

	constructor(
		private readonly prisma: PrismaService,
		private readonly search: CatalogSearchService,
	) {}

	onModuleInit() {
		void this.drain().catch((error) => {
			this.logger.warn(
				`Catalog search outbox drain failed: ${error instanceof Error ? error.message : error}`,
			);
		});
		this.timer = setInterval(() => {
			void this.drain().catch((error) => {
				this.logger.warn(
					`Catalog search outbox drain failed: ${error instanceof Error ? error.message : error}`,
				);
			});
		}, DRAIN_MS);
	}

	onModuleDestroy() {
		if(this.timer) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	private async drain() {
		if(this.draining) {
			return;
		}
		this.draining = true;
		try {
			for(;;) {
				const rows = await this.prisma.catalogSearchOutbox.findMany({
					orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
					take: BATCH,
				});
				if(rows.length === 0) {
					return;
				}
				await applyOutboxRows(this.prisma, this.search, rows as CatalogSearchOutboxRow[]);
				await this.search.flushNow();
				await this.prisma.catalogSearchOutbox.deleteMany({
					where: { id: { in: rows.map((row) => row.id) } },
				});
			}
		}
		finally {
			this.draining = false;
		}
	}
}
