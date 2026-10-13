import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService } from '../../auth/auth.service';
import type { AccessTokenPayload } from '../../auth/interfaces/jwt-payload.interface';
import type { CatalogActor } from '../catalog-actor';
import { VendorAppPasswordService } from '../vendor-app-password.service';

export type CatalogAuthedRequest = Request & {
	user?: { id: string; email: string };
	catalogActor?: CatalogActor;
};

@Injectable()
export class CatalogAuthGuard implements CanActivate {
	constructor(
		private readonly jwt: JwtService,
		private readonly auth: AuthService,
		private readonly appPasswords: VendorAppPasswordService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<CatalogAuthedRequest>();
		const bearer = this.extractBearer(req);
		const cookieToken = req.cookies?.access_token as string | undefined;

		if(bearer?.startsWith('vas_')) {
			const actor = await this.appPasswords.authenticateBearer(bearer);
			if(!actor) {
				throw new UnauthorizedException();
			}
			req.catalogActor = actor;
			return true;
		}

		const token = bearer || cookieToken;
		if(!token) {
			throw new UnauthorizedException();
		}

		try {
			const secret = process.env.JWT_ACCESS_SECRET;
			if(!secret) {
				throw new UnauthorizedException();
			}

			const payload = this.jwt.verify<AccessTokenPayload>(token, { secret });
			if(payload.type !== 'access') {
				throw new UnauthorizedException();
			}

			const user = await this.auth.getUserById(payload.sub);
			if(!user) {
				throw new UnauthorizedException();
			}

			req.user = { id: user.id, email: user.email };
			req.catalogActor = { kind: 'user', userId: user.id };
			return true;
		}
		catch {
			throw new UnauthorizedException();
		}
	}

	private extractBearer(req: Request): string | null {
		const header = req.headers.authorization;
		if(!header?.startsWith('Bearer ')) {
			return null;
		}
		return header.slice('Bearer '.length).trim() || null;
	}
}
