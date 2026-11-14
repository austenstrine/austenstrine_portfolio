export function LockIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M7 11V8a5 5 0 0 1 10 0v3"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect
				x="5"
				y="11"
				width="14"
				height="10"
				rx="2"
				stroke="currentColor"
				strokeWidth="2"
			/>
		</svg>
	);
}
