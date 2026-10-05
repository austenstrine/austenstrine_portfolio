import { Decimal } from '@prisma/client/runtime/library';

export type TrimStrategy =
  | 'WHOLE_UNITS_FIRST'
  | 'SMALLEST_REMAINDER_FIRST'
  | 'LARGEST_REMAINDER_FIRST';

export type SupplyUnit = {
  id: string;
  kind: 'whole' | 'broken';
  remainingInPieceUom: Decimal;
};

export type TrimAllocation = {
  supplyId: string;
  kind: 'whole' | 'broken';
  takeInPieceUom: Decimal;
};

const zero = new Decimal(0);

export function decimalMax(values: Decimal[]): Decimal {
  if(values.length === 0) {
    return zero;
  }
  return values.reduce((max, value) => (value.gt(max) ? value : max));
}

export function sumDecimals(values: Decimal[]): Decimal {
  return values.reduce((total, value) => total.add(value), zero);
}

export function withinLeeway(
  requested: Decimal,
  available: Decimal,
  leewayAbs: Decimal,
  leewayRatio: Decimal,
): boolean {
  if(requested.lte(available)) {
    return true;
  }
  const over = requested.sub(available);
  const ratioAllowance = available.mul(leewayRatio);
  const allowance = decimalMax([leewayAbs, ratioAllowance]);
  return over.lte(allowance);
}

export function computeMaxSingleUnitQty(
  wholePackCount: Decimal,
  pieceQtyPerPack: Decimal,
  brokenRemainders: Decimal[],
): Decimal {
  const wholeUnitSize = pieceQtyPerPack;
  const brokenMax = brokenRemainders.length > 0 ? decimalMax(brokenRemainders) : zero;

  if(wholePackCount.gt(0)) {
    return decimalMax([wholeUnitSize, brokenMax]);
  }

  return brokenMax;
}

export function sortSupplies(
  supplies: SupplyUnit[],
  strategy: TrimStrategy,
): SupplyUnit[] {
  const copy = [...supplies];

  if(strategy === 'WHOLE_UNITS_FIRST') {
    return copy.sort((a, b) => {
      if(a.kind === b.kind) {
        return b.remainingInPieceUom.comparedTo(a.remainingInPieceUom);
      }
      return a.kind === 'whole' ? -1 : 1;
    });
  }

  if(strategy === 'SMALLEST_REMAINDER_FIRST') {
    return copy.sort((a, b) => a.remainingInPieceUom.comparedTo(b.remainingInPieceUom));
  }

  return copy.sort((a, b) => b.remainingInPieceUom.comparedTo(a.remainingInPieceUom));
}

export function allocateFromSupplies(
  requestedInPieceUom: Decimal,
  supplies: SupplyUnit[],
  strategy: TrimStrategy,
  leewayAbs: Decimal,
  leewayRatio: Decimal,
): { allocations: TrimAllocation[]; remaining: Decimal } {
  let remaining = requestedInPieceUom;
  const allocations: TrimAllocation[] = [];
  const ordered = sortSupplies(supplies, strategy);

  for(const supply of ordered) {
    if(remaining.lte(0)) {
      break;
    }

    const take = Decimal.min(supply.remainingInPieceUom, remaining);
    if(take.lte(0)) {
      continue;
    }

    allocations.push({
      supplyId: supply.id,
      kind: supply.kind,
      takeInPieceUom: take,
    });
    remaining = remaining.sub(take);
  }

  const totalAvailable = sumDecimals(supplies.map((s) => s.remainingInPieceUom));
  const fulfilled = requestedInPieceUom.sub(remaining);

  if(
    remaining.gt(0)
    && !withinLeeway(requestedInPieceUom, totalAvailable, leewayAbs, leewayRatio)
    && !withinLeeway(fulfilled, requestedInPieceUom, leewayAbs, leewayRatio)
  ) {
    return { allocations: [], remaining: requestedInPieceUom };
  }

  return { allocations, remaining };
}
