type Props = {
	className?: string;
};

export function HomeIcon({ className }: Props) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.5v-6h-3v6H5a1 1 0 0 1-1-1v-9.5Z"
				stroke="currentColor"
				strokeWidth="1.75"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
