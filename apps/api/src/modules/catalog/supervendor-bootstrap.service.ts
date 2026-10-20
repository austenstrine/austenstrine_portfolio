import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
	SUPERVENDOR_ADMIN_EMAIL,
	ensureSupervendor,
} from './ensure-supervendor';

@Injectable()
export class SupervendorBootstrapService implements OnModuleInit {
	private readonly logger = new Logger(SupervendorBootstrapService.name);

	constructor(private readonly prisma: PrismaService) {}

	onModuleInit() {
		void this.ensure().catch((error) => {
			this.logger.error('Supervendor bootstrap failed', error as Error);
		});
	}

	private async ensure(): Promise<void> {
		await ensureSupervendor(this.prisma);
		this.logger.log(
			`Ensured supervendor membership for ${SUPERVENDOR_ADMIN_EMAIL}`,
		);
	}
}
