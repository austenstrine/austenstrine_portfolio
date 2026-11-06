export function MapPinIcon({ className = 'h-5 w-5' }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
			/>
			<circle
				cx="12"
				cy="10"
				r="2.5"
				stroke="currentColor"
				strokeWidth="2"
			/>
		</svg>
	);
}
