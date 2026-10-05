import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { InventoryService } from './inventory/inventory.service';
import { VendorAccessService } from './vendor-access.service';
import { VendorService } from './vendor.service';

@Module({
  imports: [AuthModule],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    InventoryService,
    VendorAccessService,
    VendorService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [CatalogService, InventoryService, VendorService],
})
export class CatalogModule {}
