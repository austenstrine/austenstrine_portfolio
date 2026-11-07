export function TruckIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			viewBox="0 0 16 16"
		>
			<path
				d="M1.5 3.5h8v7h-8zM9.5 6h3.2L14.5 8.3V10.5h-5"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
			<circle
				cx="4.25"
				cy="11.75"
				fill="currentColor"
				r="1.1"
			/>
			<circle
				cx="12"
				cy="11.75"
				fill="currentColor"
				r="1.1"
			/>
		</svg>
	);
}
