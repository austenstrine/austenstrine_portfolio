type Props = {
	className?: string;
};

export function LinkNameIcon({ className }: Props) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M10 13a5 5 0 0 0 7.07 0l1.76-1.76a5 5 0 0 0-7.07-7.07L10 5.5"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
			/>
			<path
				d="M14 11a5 5 0 0 0-7.07 0L5.17 12.76a5 5 0 0 0 7.07 7.07L14 18.5"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinecap="round"
			/>
		</svg>
	);
}
