import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CatalogArchiveService } from './archive/catalog-archive.service';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CatalogAuthGuard } from './guards/catalog-auth.guard';
import { CatalogImportService } from './import/catalog-import.service';
import { InventoryService } from './inventory/inventory.service';
import { VendorAccessService } from './vendor-access.service';
import { VendorAppPasswordService } from './vendor-app-password.service';
import { VendorInviteService } from './vendor-invite.service';
import { VendorService } from './vendor.service';

@Module({
	imports: [AuthModule],
	controllers: [CatalogController],
	providers: [
		CatalogService,
		InventoryService,
		VendorAccessService,
		VendorService,
		VendorInviteService,
		VendorAppPasswordService,
		CatalogImportService,
		CatalogArchiveService,
		CatalogAuthGuard,
		JwtAuthGuard,
		OptionalJwtAuthGuard,
	],
	exports: [CatalogService, InventoryService, VendorService, VendorAccessService],
})
export class CatalogModule {}
