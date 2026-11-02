export function CartIcon({ className = 'h-5 w-5' }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M6 6h15l-1.5 9h-12z"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinejoin="round"
			/>
			<path
				d="M6 6 5 3H2"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<circle
				cx="9"
				cy="20"
				r="1.25"
				fill="currentColor"
			/>
			<circle
				cx="18"
				cy="20"
				r="1.25"
				fill="currentColor"
			/>
		</svg>
	);
}
