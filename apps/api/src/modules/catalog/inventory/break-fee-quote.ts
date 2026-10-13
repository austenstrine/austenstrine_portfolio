import { BreakFeeMode } from '@prisma/client';

export type BreakOpenEvent = {
	parentOfferingId: string;
	containmentId: string;
	feeCents: number;
};

export function quoteBreakFeeCents(
	mode: BreakFeeMode,
	productDefaultFeeCents: number,
	opens: BreakOpenEvent[],
): number {
	if(mode === BreakFeeMode.OFF || opens.length === 0) {
		return 0;
	}

	if(mode === BreakFeeMode.PRODUCT_ONCE) {
		return productDefaultFeeCents;
	}

	if(mode === BreakFeeMode.PER_PARENT_OPENED) {
		return opens.reduce((total, row) => total + row.feeCents, 0);
	}

	if(mode === BreakFeeMode.ONCE_PER_LINE) {
		const byParent = new Map<string, number>();
		for(const row of opens) {
			if(!byParent.has(row.parentOfferingId)) {
				byParent.set(row.parentOfferingId, row.feeCents);
			}
		}
		return [...byParent.values()].reduce((total, fee) => total + fee, 0);
	}

	return 0;
}
