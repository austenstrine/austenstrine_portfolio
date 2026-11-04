import { BadRequestException, ConflictException } from '@nestjs/common';

const LINK_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Normalize a proposed name-in-the-link (lowercase, hyphen collapse). */
export function normalizeLinkName(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

/** Compare key that ignores hyphens (demo-supply ≈ demosupply). */
export function linkNameConflationKey(value: string): string {
	return normalizeLinkName(value).replace(/-/g, '');
}

export function isUuidLike(value: string): boolean {
	return UUID_PATTERN.test(value.trim());
}

export function assertValidLinkNameFormat(value: string): string {
	const normalized = normalizeLinkName(value);
	if(normalized.length < 2) {
		throw new BadRequestException(
			'Choose a name in the link with at least 2 characters.',
		);
	}
	if(!LINK_NAME_PATTERN.test(normalized)) {
		throw new BadRequestException(
			'The name in the link can only use lowercase letters, numbers, and hyphens.',
		);
	}
	return normalized;
}

function levenshtein(a: string, b: string): number {
	if(a === b) {
		return 0;
	}
	if(a.length === 0) {
		return b.length;
	}
	if(b.length === 0) {
		return a.length;
	}
	const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	for(let i = 0; i < a.length; i += 1) {
		const curr = [i + 1];
		for(let j = 0; j < b.length; j += 1) {
			const cost = a[i] === b[j] ? 0 : 1;
			curr.push(
				Math.min(
					prev[j + 1]! + 1,
					curr[j]! + 1,
					prev[j]! + cost,
				),
			);
		}
		for(let j = 0; j < prev.length; j += 1) {
			prev[j] = curr[j]!;
		}
	}
	return prev[b.length]!;
}

/**
 * Too-similar policy for seller link names:
 * exact match, hyphen-insensitive match, short edit distance, or near-prefix.
 */
export function isTooSimilarLinkName(candidate: string, existing: string): boolean {
	const a = linkNameConflationKey(candidate);
	const b = linkNameConflationKey(existing);
	if(!a || !b) {
		return false;
	}
	if(a === b) {
		return true;
	}
	const longer = a.length >= b.length ? a : b;
	const shorter = a.length >= b.length ? b : a;
	if(longer.startsWith(shorter) && longer.length - shorter.length <= 2) {
		return true;
	}
	const maxLen = Math.max(a.length, b.length);
	const distance = levenshtein(a, b);
	if(maxLen <= 6) {
		return distance <= 1;
	}
	if(maxLen <= 12) {
		return distance <= 2;
	}
	return distance <= 3 && distance / maxLen <= 0.25;
}

export type LinkNameConflictKind = 'taken' | 'too_similar';

export function findLinkNameConflict(
	candidate: string,
	existingSlugs: string[],
	opts?: { excludeSlug?: string },
): LinkNameConflictKind | null {
	const normalized = normalizeLinkName(candidate);
	const exclude = opts?.excludeSlug
		? normalizeLinkName(opts.excludeSlug)
		: null;

	for(const raw of existingSlugs) {
		const existing = normalizeLinkName(raw);
		if(exclude && existing === exclude) {
			continue;
		}
		if(existing === normalized) {
			return 'taken';
		}
		if(isTooSimilarLinkName(normalized, existing)) {
			return 'too_similar';
		}
	}
	return null;
}

export function throwLinkNameConflict(kind: LinkNameConflictKind): never {
	if(kind === 'taken') {
		throw new ConflictException(
			'That name in the link is already taken. Pick a different one.',
		);
	}
	throw new ConflictException(
		'That name is too similar to another seller’s name in the link. Try something more distinct.',
	);
}
