export function BellIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M10.3 20a1.7 1.7 0 0 0 3.4 0"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
