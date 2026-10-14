import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogModule } from '../catalog/catalog.module';
import { CartService } from './cart.service';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { ConnectService } from './connect.service';
import { PayoutService } from './payout.service';
import { ShippingService } from './shipping.service';
import { StripeService } from './stripe.service';

@Module({
	imports: [AuthModule, CatalogModule],
	controllers: [CheckoutController],
	providers: [
		CartService,
		CheckoutService,
		ConnectService,
		PayoutService,
		ShippingService,
		StripeService,
		JwtAuthGuard,
	],
	exports: [CartService, CheckoutService, ShippingService, ConnectService, PayoutService],
})
export class CheckoutModule {}
