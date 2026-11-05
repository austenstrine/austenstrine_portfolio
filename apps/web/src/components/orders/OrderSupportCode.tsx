'use client';

type OrderSupportCodeProps = {
	orderId: string;
	className?: string;
};

/** Collapsed UUID for support only — not the everyday order name. */
export function OrderSupportCode({
	orderId,
	className,
}: OrderSupportCodeProps) {
	return (
		<details
			className={
				className
					?? `
						mt-2
						text-xs
						text-slate-500
					`
			}
		>
			<summary
				className="
					cursor-pointer
					select-none
					hover:text-slate-700
				"
			>
				Support code
			</summary>
			<p
				className="
					mt-1
					break-all
					font-mono
					text-[0.7rem]
					text-slate-600
				"
			>
				{orderId}
			</p>
		</details>
	);
}
