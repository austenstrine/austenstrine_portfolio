'use client';

import {
	ORDER_STATUS_FILTERS,
	type OrderStatusFilter,
} from './order-display';

export const ordersFrostControlClassName = `
	rounded-full
	border
	border-slate-300
	bg-white
	px-2.5
	py-1.5
	text-sm
	font-semibold
	text-ink
`;

type OrdersListFiltersProps = {
	filterText: string;
	onFilterTextChange: (value: string) => void;
	statusFilter: OrderStatusFilter;
	onStatusFilterChange: (value: OrderStatusFilter) => void;
	/** Buyer list uses softer status labels than seller fulfillment. */
	statusOptions?: Array<{
		id: OrderStatusFilter;
		label: string;
	}>;
	filterPlaceholder: string;
};

export function OrdersListFilters({
	filterText,
	onFilterTextChange,
	statusFilter,
	onStatusFilterChange,
	statusOptions = ORDER_STATUS_FILTERS,
	filterPlaceholder,
}: OrdersListFiltersProps) {
	return (
		<>
			<label
				className="
					inline-flex
					min-w-[9rem]
					max-w-[14rem]
					flex-1
					flex-col
					gap-0.5
					text-[11px]
					font-medium
					text-slate-500
				"
			>
				<span>
					Filter
				</span>
				<input
					aria-label="Filter orders"
					className={ordersFrostControlClassName}
					onChange={(event) => onFilterTextChange(event.target.value)}
					placeholder={filterPlaceholder}
					type="search"
					value={filterText}
				/>
			</label>
			<label
				className="
					inline-flex
					flex-col
					gap-0.5
					text-[11px]
					font-medium
					text-slate-500
				"
			>
				<span>
					Status
				</span>
				<select
					aria-label="Order status filter"
					className={ordersFrostControlClassName}
					onChange={(event) => {
						const next = event.target.value as OrderStatusFilter;
						if(ORDER_STATUS_FILTERS.some((row) => row.id === next)) {
							onStatusFilterChange(next);
						}
					}}
					value={statusFilter}
				>
					{statusOptions.map((row) => (
						<option
							key={row.id}
							value={row.id}
						>
							{row.label}
						</option>
					))}
				</select>
			</label>
		</>
	);
}
