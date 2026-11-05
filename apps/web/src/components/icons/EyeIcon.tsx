export function EyeIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			viewBox="0 0 16 16"
		>
			<path
				d="M1.75 8s2.25-4.25 6.25-4.25S14.25 8 14.25 8s-2.25 4.25-6.25 4.25S1.75 8 1.75 8Z"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
			<circle
				cx="8"
				cy="8"
				r="1.75"
				stroke="currentColor"
				strokeWidth="1.5"
			/>
		</svg>
	);
}
