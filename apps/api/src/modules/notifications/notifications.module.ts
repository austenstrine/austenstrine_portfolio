import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
	imports: [AuthModule],
	controllers: [NotificationsController],
	providers: [NotificationsService, JwtAuthGuard],
	exports: [NotificationsService],
})
export class NotificationsModule {}
