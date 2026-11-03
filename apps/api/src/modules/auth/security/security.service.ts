import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';

@Injectable()
export class SecurityService {
	async hashPassword(password: string): Promise<string> {
		return argon2.hash(password, { type: argon2.argon2id });
	}

	async verifyPassword(hash: string, password: string): Promise<boolean> {
		try {
			return await argon2.verify(hash, password);
		}
		catch {
			return false;
		}
	}

	generateOtpCode(): string {
		return randomInt(0, 1_000_000).toString().padStart(6, '0');
	}

	hashOtpCode(code: string): string {
		return createHmac('sha256', this.otpPepper()).update(code).digest('hex');
	}

	compareOtpHash(code: string, hash: string): boolean {
		const candidate = Buffer.from(this.hashOtpCode(code), 'hex');
		const expected = Buffer.from(hash, 'hex');

		if(candidate.length !== expected.length) {
			return false;
		}

		return timingSafeEqual(candidate, expected);
	}

	generateOpaqueToken(): string {
		return randomBytes(32).toString('hex');
	}

	hashOpaqueToken(token: string): string {
		return createHmac('sha256', this.otpPepper()).update(token).digest('hex');
	}

	/** Empty pepper is fine in local; production must set OTP_PEPPER. */
	private otpPepper(): string {
		const pepper = process.env.OTP_PEPPER ?? '';
		if(process.env.NODE_ENV === 'production' && !pepper.trim()) {
			throw new Error('OTP_PEPPER is required when NODE_ENV=production.');
		}
		return pepper;
	}

	normalizeEmail(email: string): string {
		return email.trim().toLowerCase();
	}
}
