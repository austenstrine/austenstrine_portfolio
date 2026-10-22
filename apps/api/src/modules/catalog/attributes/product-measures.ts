import { ProductCondition } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export type ProductMeasureInput = {
	lengthNumeric?: string | null;
	widthNumeric?: string | null;
	heightNumeric?: string | null;
	linearUnit?: string | null;
	weightNumeric?: string | null;
	weightUnit?: string | null;
	packageLengthNumeric?: string | null;
	packageWidthNumeric?: string | null;
	packageHeightNumeric?: string | null;
	packageLinearUnit?: string | null;
	packageWeightNumeric?: string | null;
	packageWeightUnit?: string | null;
	volumeNumeric?: string | null;
	volumeUnit?: string | null;
	netContentNumeric?: string | null;
	netContentUnit?: string | null;
	piecesPerRetailUnit?: number | null;
	voltageNumeric?: string | null;
	wattageNumeric?: string | null;
	amperageNumeric?: string | null;
	frequencyHzNumeric?: string | null;
	capacityNumeric?: string | null;
	capacityUnit?: string | null;
	gtin?: string | null;
	mpn?: string | null;
	countryOfOrigin?: string | null;
	condition?: ProductCondition;
	releaseAt?: string | null;
	expiresAt?: string | null;
};

const DECIMAL_KEYS = [
	'lengthNumeric',
	'widthNumeric',
	'heightNumeric',
	'weightNumeric',
	'packageLengthNumeric',
	'packageWidthNumeric',
	'packageHeightNumeric',
	'packageWeightNumeric',
	'volumeNumeric',
	'netContentNumeric',
	'voltageNumeric',
	'wattageNumeric',
	'amperageNumeric',
	'frequencyHzNumeric',
	'capacityNumeric',
] as const;

const STRING_KEYS = [
	'linearUnit',
	'weightUnit',
	'packageLinearUnit',
	'packageWeightUnit',
	'volumeUnit',
	'netContentUnit',
	'capacityUnit',
	'gtin',
	'mpn',
	'countryOfOrigin',
] as const;

function parseDecimal(raw: string | null | undefined): Decimal | null | undefined {
	if(raw === undefined) {
		return undefined;
	}
	if(raw === null || raw.trim() === '') {
		return null;
	}
	return new Decimal(raw);
}

export function measuresToPrisma(
	input: ProductMeasureInput,
): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	for(const key of DECIMAL_KEYS) {
		const parsed = parseDecimal(input[key]);
		if(parsed !== undefined) {
			data[key] = parsed;
		}
	}
	for(const key of STRING_KEYS) {
		if(input[key] !== undefined) {
			data[key] = input[key] ? input[key] : null;
		}
	}
	if(input.piecesPerRetailUnit !== undefined) {
		data.piecesPerRetailUnit = input.piecesPerRetailUnit;
	}
	if(input.condition !== undefined) {
		data.condition = input.condition;
	}
	if(input.releaseAt !== undefined) {
		data.releaseAt = input.releaseAt ? new Date(input.releaseAt) : null;
	}
	if(input.expiresAt !== undefined) {
		data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
	}
	return data;
}

export function serializeMeasures(product: Record<string, unknown>) {
	const decimal = (value: unknown) =>
		value == null ? null : String(value);
	const text = (value: unknown) =>
		value == null ? null : String(value);
	return {
		lengthNumeric: decimal(product.lengthNumeric),
		widthNumeric: decimal(product.widthNumeric),
		heightNumeric: decimal(product.heightNumeric),
		linearUnit: text(product.linearUnit),
		weightNumeric: decimal(product.weightNumeric),
		weightUnit: text(product.weightUnit),
		packageLengthNumeric: decimal(product.packageLengthNumeric),
		packageWidthNumeric: decimal(product.packageWidthNumeric),
		packageHeightNumeric: decimal(product.packageHeightNumeric),
		packageLinearUnit: text(product.packageLinearUnit),
		packageWeightNumeric: decimal(product.packageWeightNumeric),
		packageWeightUnit: text(product.packageWeightUnit),
		volumeNumeric: decimal(product.volumeNumeric),
		volumeUnit: text(product.volumeUnit),
		netContentNumeric: decimal(product.netContentNumeric),
		netContentUnit: text(product.netContentUnit),
		piecesPerRetailUnit:
			product.piecesPerRetailUnit == null ? null : Number(product.piecesPerRetailUnit),
		voltageNumeric: decimal(product.voltageNumeric),
		wattageNumeric: decimal(product.wattageNumeric),
		amperageNumeric: decimal(product.amperageNumeric),
		frequencyHzNumeric: decimal(product.frequencyHzNumeric),
		capacityNumeric: decimal(product.capacityNumeric),
		capacityUnit: text(product.capacityUnit),
		gtin: text(product.gtin),
		mpn: text(product.mpn),
		countryOfOrigin: text(product.countryOfOrigin),
		condition: text(product.condition) ?? 'NA',
		releaseAt: product.releaseAt ?? null,
		expiresAt: product.expiresAt ?? null,
	};
}
