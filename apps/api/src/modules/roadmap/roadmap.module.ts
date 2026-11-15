import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RoadmapController } from './roadmap.controller';
import { RoadmapService } from './roadmap.service';

@Module({
	imports: [AuthModule],
	controllers: [RoadmapController],
	providers: [RoadmapService, OptionalJwtAuthGuard],
})
export class RoadmapModule {}
