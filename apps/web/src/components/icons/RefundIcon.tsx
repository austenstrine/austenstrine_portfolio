export function RefundIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			viewBox="0 0 16 16"
		>
			<path
				d="M4.5 6.5H2.25V4.25"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
			<path
				d="M2.5 6.25A5.75 5.75 0 1 1 2.9 9.5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.5"
			/>
		</svg>
	);
}
