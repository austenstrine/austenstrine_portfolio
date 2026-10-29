export function PhoneIcon({ className = 'h-5 w-5' }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<rect
				x="7"
				y="2"
				width="10"
				height="20"
				rx="2"
				stroke="currentColor"
				strokeWidth="2"
			/>
			<path
				d="M11 5h2"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<path
				d="M12 18h.01"
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
			/>
		</svg>
	);
}
