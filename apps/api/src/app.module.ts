import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { InfraModule } from './infra/infra.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { ProjectsModule } from './modules/projects/projects.module';

/** Default per-route ceiling. OTP/login keep tighter `@Throttle` on those handlers. */
function defaultThrottleLimit(): number {
	const fromEnv = Number(process.env.THROTTLE_LIMIT);
	if(Number.isFinite(fromEnv) && fromEnv > 0) {
		return Math.floor(fromEnv);
	}
	// Local/dev SPA + SSR + audits exceed 60/min on seller surfaces (manage Load more, rapid nav).
	return process.env.NODE_ENV === 'production' ? 120 : 600;
}

@Module({
	imports: [
		ThrottlerModule.forRoot([
			{
				name: 'default',
				ttl: 60_000,
				limit: defaultThrottleLimit(),
			},
		]),
		InfraModule,
		AuthModule,
		HealthModule,
		ProjectsModule,
		CatalogModule,
		CheckoutModule,
	],
	providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

