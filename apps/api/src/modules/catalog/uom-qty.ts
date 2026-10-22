export type QtyCompound = {
	major?: string;
	minor?: string;
	fraction?: string;
};

export type CompoundQtyProfile = {
	code: string;
	majorLabel: string;
	minorLabel?: string;
	minorPerMajor?: number;
	fractionDenominator?: number;
	fractionLabel?: string;
};

const PROFILES: Record<string, CompoundQtyProfile> = {
	FT: {
		code: 'FT',
		majorLabel: 'Feet',
		minorLabel: 'Inches',
		minorPerMajor: 12,
		fractionDenominator: 32,
		fractionLabel: '32nds of an inch',
	},
	IN: {
		code: 'IN',
		majorLabel: 'Inches',
		fractionDenominator: 32,
		fractionLabel: '32nds of an inch',
	},
	LB: {
		code: 'LB',
		majorLabel: 'Pounds',
		minorLabel: 'Ounces',
		minorPerMajor: 16,
	},
	KG: {
		code: 'KG',
		majorLabel: 'Kilograms',
		minorLabel: 'Grams',
		minorPerMajor: 1000,
	},
	M: {
		code: 'M',
		majorLabel: 'Meters',
		minorLabel: 'Millimeters',
		minorPerMajor: 1000,
	},
};

export function normalizeUomCode(code: string | null | undefined): string {
	const raw = (code ?? '').trim().toUpperCase();
	if(['FOOT', 'FEET'].includes(raw)) {
		return 'FT';
	}
	if(['INCH', 'INCHES'].includes(raw)) {
		return 'IN';
	}
	if(['LBS', 'POUND', 'POUNDS'].includes(raw)) {
		return 'LB';
	}
	if(['KILOGRAM', 'KILOGRAMS'].includes(raw)) {
		return 'KG';
	}
	if(['METER', 'METERS'].includes(raw)) {
		return 'M';
	}
	return raw;
}

export function compoundQtyProfile(
	code: string | null | undefined,
): CompoundQtyProfile | null {
	return PROFILES[normalizeUomCode(code)] ?? null;
}

export function compoundToDecimal(
	uomCode: string,
	compound: QtyCompound,
): string {
	const profile = compoundQtyProfile(uomCode);
	if(!profile) {
		throw new Error(`Compound quantity is not supported for ${uomCode}.`);
	}

	const major = parsePart(compound.major, profile.majorLabel);
	const minor = parsePart(compound.minor, profile.minorLabel ?? 'minor');
	const fraction = parsePart(compound.fraction, profile.fractionLabel ?? 'fraction');

	if(profile.minorPerMajor != null && minor >= profile.minorPerMajor) {
		throw new Error(
			`${profile.minorLabel} must be less than ${profile.minorPerMajor}.`,
		);
	}
	if(
		profile.fractionDenominator != null
		&& fraction >= profile.fractionDenominator
	) {
		throw new Error(
			`${profile.fractionLabel} must be less than ${profile.fractionDenominator}.`,
		);
	}

	const minorPerMajor = profile.minorPerMajor ?? 1;
	const denominator = profile.fractionDenominator ?? 1;
	const total = (
		(major * minorPerMajor * denominator)
		+ (minor * denominator)
		+ fraction
	) / (minorPerMajor * denominator);

	return trimDecimal(total);
}

export function decimalToCompound(
	uomCode: string,
	decimal: string,
): QtyCompound {
	const profile = compoundQtyProfile(uomCode);
	if(!profile) {
		return { major: decimal || '0' };
	}

	const value = Number(decimal);
	if(!Number.isFinite(value) || value < 0) {
		return { major: '0', minor: '0', fraction: '0' };
	}

	const minorPerMajor = profile.minorPerMajor ?? 1;
	const denominator = profile.fractionDenominator ?? 1;
	const total = Math.round(value * minorPerMajor * denominator);
	const major = Math.floor(total / (minorPerMajor * denominator));
	const remainder = total % (minorPerMajor * denominator);
	const minor = Math.floor(remainder / denominator);
	const fraction = remainder % denominator;

	return {
		major: String(major),
		minor: profile.minorLabel ? String(minor) : undefined,
		fraction: profile.fractionDenominator ? String(fraction) : undefined,
	};
}

export function resolveQty(
	uomCode: string,
	qtyOnHand?: string | null,
	qtyCompound?: QtyCompound | null,
): string {
	if(qtyCompound && hasCompoundParts(qtyCompound)) {
		return compoundToDecimal(uomCode, qtyCompound);
	}
	if(qtyOnHand == null || qtyOnHand.trim() === '') {
		return '0';
	}
	const parsed = Number(qtyOnHand);
	if(!Number.isFinite(parsed) || parsed < 0) {
		throw new Error('Quantity must be a number 0 or greater.');
	}
	return trimDecimal(parsed);
}

export function formatQty(
	decimal: string,
	uomCode: string | null | undefined,
): string {
	const profile = compoundQtyProfile(uomCode);
	const code = normalizeUomCode(uomCode);
	if(!profile) {
		return code ? `${decimal} ${code.toLowerCase()}` : decimal;
	}

	const parts = decimalToCompound(code, decimal);
	const tokens: string[] = [];
	if(Number(parts.major) > 0 || (!Number(parts.minor) && !Number(parts.fraction))) {
		tokens.push(`${parts.major} ${profile.majorLabel.toLowerCase()}`);
	}
	if(profile.minorLabel && Number(parts.minor) > 0) {
		tokens.push(`${parts.minor} ${profile.minorLabel.toLowerCase()}`);
	}
	if(profile.fractionDenominator && Number(parts.fraction) > 0) {
		tokens.push(formatFraction(Number(parts.fraction), profile.fractionDenominator));
	}
	if(tokens.length === 0) {
		return `0 ${profile.majorLabel.toLowerCase()}`;
	}
	return tokens.join(' ');
}

function hasCompoundParts(compound: QtyCompound): boolean {
	return [compound.major, compound.minor, compound.fraction].some(
		(part) => part != null && String(part).trim() !== '',
	);
}

function parsePart(raw: string | undefined, label: string): number {
	if(raw == null || String(raw).trim() === '') {
		return 0;
	}
	const parsed = Number(raw);
	if(!Number.isFinite(parsed) || parsed < 0) {
		throw new Error(`${label} must be a number 0 or greater.`);
	}
	return parsed;
}

function trimDecimal(value: number): string {
	if(!Number.isFinite(value)) {
		return '0';
	}
	return value.toFixed(8).replace(/\.?0+$/, '');
}

function formatFraction(numerator: number, denominator: number): string {
	const divisor = gcd(numerator, denominator);
	return `${numerator / divisor}/${denominator / divisor} in`;
}

function gcd(left: number, right: number): number {
	let a = Math.abs(left);
	let b = Math.abs(right);
	while(b !== 0) {
		const next = a % b;
		a = b;
		b = next;
	}
	return a || 1;
}
