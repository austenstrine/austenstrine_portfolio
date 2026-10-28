import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = new Map([
	['image/jpeg', 'jpg'],
	['image/jpg', 'jpg'],
	['image/png', 'png'],
	['image/webp', 'webp'],
	['image/gif', 'gif'],
	['image/avif', 'avif'],
]);

const MAX_BYTES = 8 * 1024 * 1024;

@Injectable()
export class CdnMediaService {
	private readonly internalUrl = (process.env.CDN_INTERNAL_URL ?? 'http://127.0.0.1:8088').replace(/\/$/, '');
	private readonly publicUrl = (process.env.CDN_PUBLIC_URL ?? process.env.NEXT_PUBLIC_CDN_URL ?? '').replace(/\/$/, '');
	private readonly token = process.env.CDN_TOKEN ?? '';

	async putObject(params: {
		folder: string;
		buffer: Buffer;
		mimeType: string;
		originalName?: string;
	}): Promise<{ path: string; url: string }> {
		const ext = this.extensionFor(params.mimeType, params.originalName);
		const folder = params.folder.replace(/^\/+|\/+$/g, '');
		const path = `/media/${folder}/${randomUUID()}.${ext}`;
		if(!this.token) {
			throw new ServiceUnavailableException('CDN_TOKEN is not configured.');
		}

		let response: Response;
		try {
			response = await fetch(`${this.internalUrl}${path}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${this.token}`,
					'Content-Type': params.mimeType || 'application/octet-stream',
					'Content-Length': String(params.buffer.length),
				},
				body: new Uint8Array(params.buffer),
			});
		}
		catch(error) {
			throw new ServiceUnavailableException(
				`CDN is unreachable at ${this.internalUrl}. ${error instanceof Error ? error.message : ''}`.trim(),
			);
		}

		if(!response.ok) {
			const detail = await response.text().catch(() => '');
			throw new ServiceUnavailableException(
				`CDN upload failed (${response.status}). ${detail}`.trim(),
			);
		}

		const body = await response.json().catch(() => null) as { url?: string; path?: string } | null;
		return {
			path: body?.path ?? path,
			url: body?.url ?? (this.publicUrl ? `${this.publicUrl}${path}` : path),
		};
	}

	assertImageFile(file?: { buffer: Buffer; mimetype: string; size: number; originalname: string }) {
		if(!file?.buffer?.length) {
			throw new BadRequestException('Choose an image file to upload.');
		}
		if(file.size > MAX_BYTES) {
			throw new BadRequestException('Images must be 8 MB or smaller.');
		}
		if(!ALLOWED_TYPES.has(file.mimetype)) {
			throw new BadRequestException('Use a JPEG, PNG, WebP, GIF, or AVIF image.');
		}
		return file;
	}

	private extensionFor(mimeType: string, originalName?: string): string {
		const fromMime = ALLOWED_TYPES.get(mimeType);
		if(fromMime) {
			return fromMime;
		}
		const fromName = originalName?.split('.').pop()?.toLowerCase();
		if(fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(fromName)) {
			return fromName === 'jpeg' ? 'jpg' : fromName;
		}
		return 'jpg';
	}
}
