export function SortIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			viewBox="0 0 24 24"
		>
			<path
				d="M8 4v16"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.75"
			/>
			<path
				d="m5 7 3-3 3 3"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.75"
			/>
			<path
				d="M16 20V4"
				stroke="currentColor"
				strokeLinecap="round"
				strokeWidth="1.75"
			/>
			<path
				d="m13 17 3 3 3-3"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.75"
			/>
		</svg>
	);
}
