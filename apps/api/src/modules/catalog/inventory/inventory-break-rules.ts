import { Decimal } from '@prisma/client/runtime/library';

const zero = new Decimal(0);

export type ParentBreakRules = {
	minUnbrokenQty: Decimal;
	breakPoolAboveQty: Decimal;
	inheritQtyToChildren: boolean;
};

export function computeEligibleWholeUnits(
	unclaimedWhole: Decimal,
	rules: ParentBreakRules,
): Decimal {
	if(rules.minUnbrokenQty.lt(0)) {
		return zero;
	}

	const poolFromCeiling = Decimal.max(unclaimedWhole.sub(rules.breakPoolAboveQty), zero);
	const poolFromFloor = Decimal.max(unclaimedWhole.sub(rules.minUnbrokenQty), zero);

	return Decimal.min(poolFromCeiling, poolFromFloor);
}

export function autoBreakAllowed(rules: Pick<ParentBreakRules, 'minUnbrokenQty'>): boolean {
	return rules.minUnbrokenQty.gte(0);
}
