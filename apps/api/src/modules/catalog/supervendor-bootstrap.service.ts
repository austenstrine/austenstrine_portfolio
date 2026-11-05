import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { seedDemoNotifications } from '../notifications/seed-demo-notifications';
import {
	SUPERVENDOR_ADMIN_EMAIL,
	ensureSupervendor,
} from './ensure-supervendor';
import { seedDemoVendorOrg } from './seed-demo-vendor-org';

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
		await seedDemoNotifications(this.prisma);
		try {
			await seedDemoVendorOrg(this.prisma);
			this.logger.log('Ensured Demo Supply seller seed (members/orders)');
		}
		catch(error) {
			this.logger.warn(
				`Demo Supply seller seed skipped: ${(error as Error).message}`,
			);
		}
		this.logger.log(
			`Ensured supervendor membership for ${SUPERVENDOR_ADMIN_EMAIL}`,
		);
	}
}
