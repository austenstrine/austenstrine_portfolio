export function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			viewBox="0 0 16 16"
		>
			<path
				d="M3.5 4.5h9M6.5 4.5V3.25h3V4.5M5.25 4.5l.5 8.25h4.5l.5-8.25"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
		</svg>
	);
}
