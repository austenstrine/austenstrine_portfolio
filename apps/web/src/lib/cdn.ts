function trimSlash(url: string) {
	return url.replace(/\/$/, '');
}

export const CDN_BASE_URL = trimSlash(process.env.NEXT_PUBLIC_CDN_URL ?? '');

export type CdnImageOptions = {
	w?: number;
	h?: number;
	fit?: 'contain' | 'cover' | 'inside';
	fm?: 'auto' | 'webp' | 'jpeg' | 'png';
	q?: number;
};

export function cdnUrl(path: string, options?: CdnImageOptions) {
	const normalized = path.startsWith('/') ? path : `/${path}`;
	if(!CDN_BASE_URL) {
		return normalized;
	}

	const url = new URL(normalized, `${CDN_BASE_URL}/`);
	if(options?.w) {
		url.searchParams.set('w', String(options.w));
	}
	if(options?.h) {
		url.searchParams.set('h', String(options.h));
	}
	if(options?.fit) {
		url.searchParams.set('fit', options.fit);
	}
	if(options?.fm) {
		url.searchParams.set('fm', options.fm);
	}
	if(options?.q) {
		url.searchParams.set('q', String(options.q));
	}
	return url.toString();
}
