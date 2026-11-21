import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CatalogModule } from '../catalog/catalog.module';
import { CrmOriginGuard } from '../catalog/guards/crm-origin.guard';
import { RoadmapController } from './roadmap.controller';
import { RoadmapService } from './roadmap.service';

@Module({
	imports: [AuthModule, CatalogModule],
	controllers: [RoadmapController],
	providers: [
		RoadmapService,
		OptionalJwtAuthGuard,
		JwtAuthGuard,
		CrmOriginGuard,
	],
})
export class RoadmapModule {}
