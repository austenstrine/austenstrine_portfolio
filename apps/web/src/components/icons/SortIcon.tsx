export function SortIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			viewBox="0 0 24 24"
		>
			<path
				d="M8 9 12 5 16 9"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.75"
			/>
			<path
				d="M8 15 12 19 16 15"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.75"
			/>
		</svg>
	);
}
