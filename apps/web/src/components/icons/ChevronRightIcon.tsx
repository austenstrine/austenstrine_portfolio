/** Shaftless chevron — in-place drill / submenu disclosure (not page navigation). */
export function ChevronRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
	return (
		<svg
			aria-hidden="true"
			className={className}
			fill="none"
			viewBox="0 0 16 16"
		>
			<path
				d="M6.25 4 10.25 8 6.25 12"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="1.5"
			/>
		</svg>
	);
}
