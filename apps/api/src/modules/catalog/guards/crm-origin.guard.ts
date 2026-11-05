import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
	crmOrigin,
	isCrmBrowserOrigin,
	isWebBrowserOrigin,
	requestBrowserOrigin,
} from '../../../common/app-origins';

/**
 * Rejects Place et Marque (WEB_URL) and any other non-CRM browser origin.
 * Requires CRM_URL to be configured.
 */
export function assertCrmBrowserOrigin(req: Pick<Request, 'headers'>): void {
	const crm = crmOrigin();
	if(!crm) {
		throw new ServiceUnavailableException(
			'CRM_URL is not configured; admin CRM routes are unavailable.',
		);
	}

	const headers = {
		origin: req.headers.origin,
		referer: req.headers.referer,
	};

	if(isCrmBrowserOrigin(headers)) {
		return;
	}

	if(isWebBrowserOrigin(headers)) {
		throw new ForbiddenException(
			'This admin action is only available from the CRM app.',
		);
	}

	const browser = requestBrowserOrigin(headers);
	throw new ForbiddenException(
		browser
			? 'This admin action is only available from the CRM app.'
			: 'CRM admin routes require a CRM browser origin.',
	);
}

/**
 * Admin / CRM-only routes. Rejects Place et Marque (WEB_URL) and any other
 * non-CRM browser origin. Requires CRM_URL to be configured.
 */
@Injectable()
export class CrmOriginGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const req = context.switchToHttp().getRequest<Request>();
		assertCrmBrowserOrigin(req);
		return true;
	}
}
