export function CodeIcon({ className = 'h-6 w-6' }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M8 7 3 12l5 5M16 7l5 5-5 5M14 4l-4 16"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
