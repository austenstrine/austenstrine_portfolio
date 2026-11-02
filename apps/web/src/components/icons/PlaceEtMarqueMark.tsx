export function PlaceEtMarqueMark({ className = 'h-8 w-8' }: { className?: string }) {
	return (
		<img
			alt=""
			aria-hidden="true"
			className={className}
			src="/icon.svg"
		/>
	);
}
