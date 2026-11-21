type Props = {
	className?: string;
};

export function ApproveIcon({ className }: Props) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M5 12.5 10 17.5 19 7.5"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
