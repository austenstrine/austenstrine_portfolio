export function MoreVerticalIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 16 16"
			fill="none"
			aria-hidden="true"
		>
			<circle
				cx="8"
				cy="3.5"
				r="1.25"
				fill="currentColor"
			/>
			<circle
				cx="8"
				cy="8"
				r="1.25"
				fill="currentColor"
			/>
			<circle
				cx="8"
				cy="12.5"
				r="1.25"
				fill="currentColor"
			/>
		</svg>
	);
}
