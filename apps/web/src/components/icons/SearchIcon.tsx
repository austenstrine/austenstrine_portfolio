export function SearchIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<circle
				cx="11"
				cy="11"
				r="6.5"
				stroke="currentColor"
				strokeWidth="1.75"
			/>
			<path
				d="M16.5 16.5 20 20"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
			/>
		</svg>
	);
}
