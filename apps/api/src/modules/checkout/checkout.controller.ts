import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Headers,
	Param,
	Post,
	Put,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CartService } from './cart.service';
import { CheckoutService } from './checkout.service';
import { ConnectService } from './connect.service';
import { UpsertCartLineDto } from './dto/cart.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import {
	AssignProductShippingDto,
	UpsertShippingProfileDto,
} from './dto/shipping-admin.dto';
import { RefundOrderDto } from './dto/refund.dto';
import { PayoutService } from './payout.service';
import { RefundService } from './refund.service';
import { ShippingService } from './shipping.service';
import { StripeService } from './stripe.service';

type AuthedRequest = Request & { user?: { id: string } };
type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('checkout')
@Controller('checkout')
export class CheckoutController {
	constructor(
		private readonly cart: CartService,
		private readonly checkout: CheckoutService,
		private readonly shipping: ShippingService,
		private readonly stripe: StripeService,
		private readonly connect: ConnectService,
		private readonly payouts: PayoutService,
		private readonly refunds: RefundService,
	) {}

	@UseGuards(JwtAuthGuard)
	@Get('cart')
	getCart(@Req() req: AuthedRequest) {
		return this.cart.getCart(req.user!.id);
	}

	@UseGuards(JwtAuthGuard)
	@Put('cart/lines')
	upsertCartLine(@Req() req: AuthedRequest, @Body() dto: UpsertCartLineDto) {
		return this.cart.upsertLine(req.user!.id, dto.offeringId, dto.quantity);
	}

	@UseGuards(JwtAuthGuard)
	@Delete('cart/lines/:offeringId')
	removeCartLine(
		@Req() req: AuthedRequest,
		@Param('offeringId') offeringId: string,
	) {
		return this.cart.removeLine(req.user!.id, offeringId);
	}

	@UseGuards(JwtAuthGuard)
	@Delete('cart')
	clearCart(@Req() req: AuthedRequest) {
		return this.cart.clearCart(req.user!.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('preview')
	preview(@Req() req: AuthedRequest) {
		return this.checkout.preview(req.user!.id);
	}

	@UseGuards(JwtAuthGuard)
	@Post('sessions')
	createSession(@Req() req: AuthedRequest, @Body() dto: CreateCheckoutSessionDto) {
		return this.checkout.createSession(req.user!.id, dto);
	}

	@Post('webhooks/stripe')
	async stripeWebhook(
		@Req() req: RawBodyRequest,
		@Headers('stripe-signature') signature: string | undefined,
	) {
		if(!signature) {
			throw new BadRequestException('Missing stripe-signature header.');
		}
		const rawBody = req.rawBody;
		if(!rawBody) {
			throw new BadRequestException(
				'Raw body unavailable for Stripe signature verification.',
			);
		}

		try {
			const event = this.stripe.constructEvent(rawBody, signature);
			return this.checkout.handleStripeEvent(event);
		}
		catch(error) {
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Invalid Stripe webhook.',
			);
		}
	}

	@UseGuards(JwtAuthGuard)
	@Get('orders')
	listOrders(@Req() req: AuthedRequest) {
		return this.checkout.listBuyerOrders(req.user!.id);
	}

	@UseGuards(JwtAuthGuard)
	@Get('orders/:orderId')
	getOrder(@Req() req: AuthedRequest, @Param('orderId') orderId: string) {
		return this.checkout.getBuyerOrder(req.user!.id, orderId);
	}

	@UseGuards(JwtAuthGuard)
	@Get('vendors/:vendorId/shipping-profiles')
	listShipping(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
	) {
		return this.shipping.listProfiles(req.user!.id, vendorId);
	}

	@UseGuards(JwtAuthGuard)
	@Put('vendors/:vendorId/shipping-profiles')
	upsertShipping(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
		@Body() dto: UpsertShippingProfileDto,
	) {
		return this.shipping.upsertProfile(req.user!.id, vendorId, dto);
	}

	@UseGuards(JwtAuthGuard)
	@Put('products/:productId/shipping-profile')
	assignProductShipping(
		@Req() req: AuthedRequest,
		@Param('productId') productId: string,
		@Body() dto: AssignProductShippingDto,
	) {
		return this.shipping.assignProductProfile(
			req.user!.id,
			productId,
			dto.shippingProfileId ?? null,
		);
	}

	@UseGuards(JwtAuthGuard)
	@Get('vendors/:vendorId/orders')
	listVendorOrders(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
	) {
		return this.checkout.listVendorOrders(req.user!.id, vendorId);
	}

	@UseGuards(JwtAuthGuard)
	@Post('vendors/:vendorId/orders/:orderId/ship')
	shipVendorOrder(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
		@Param('orderId') orderId: string,
	) {
		return this.checkout.markShipped(req.user!.id, vendorId, orderId);
	}

	@UseGuards(JwtAuthGuard)
	@Post('orders/:orderId/cancel')
	cancelBuyerOrder(
		@Req() req: AuthedRequest,
		@Param('orderId') orderId: string,
		@Body() dto: RefundOrderDto,
	) {
		return this.refunds.cancelAsBuyer(req.user!.id, orderId, dto.note);
	}

	@UseGuards(JwtAuthGuard)
	@Post('vendors/:vendorId/orders/:orderId/refund')
	refundVendorOrder(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
		@Param('orderId') orderId: string,
		@Body() dto: RefundOrderDto,
	) {
		return this.refunds.refundAsVendor(req.user!.id, vendorId, orderId, {
			note: dto.note,
			asCancel: dto.asCancel,
		});
	}

	@UseGuards(JwtAuthGuard)
	@Post('vendors/:vendorId/connect/account')
	createConnectAccount(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
	) {
		return this.connect.createAccount(req.user!.id, vendorId);
	}

	@UseGuards(JwtAuthGuard)
	@Post('vendors/:vendorId/connect/account-link')
	createConnectAccountLink(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
	) {
		return this.connect.createAccountLink(req.user!.id, vendorId);
	}

	@UseGuards(JwtAuthGuard)
	@Get('vendors/:vendorId/connect/status')
	getConnectStatus(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
	) {
		return this.connect.getStatus(req.user!.id, vendorId);
	}

	@UseGuards(JwtAuthGuard)
	@Get('vendors/:vendorId/payouts/summary')
	getVendorPayoutSummary(
		@Req() req: AuthedRequest,
		@Param('vendorId') vendorId: string,
	) {
		return this.connect.getStatus(req.user!.id, vendorId).then(async (status) => {
			const summary = await this.payouts.getVendorPayoutSummary(vendorId);
			return { ...status, ...summary };
		});
	}
}
