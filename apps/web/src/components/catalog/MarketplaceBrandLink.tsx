import { PlaceEtMarqueMark } from '../icons/PlaceEtMarqueMark';

export function MarketplaceBrandLink({
	className = `
		inline-flex
		shrink-0
		items-center
		gap-2
		whitespace-nowrap
		text-ink
	`,
	markClassName = `
		block
		h-8
		w-8
		rounded-md
	`,
	nameClassName = `
		text-lg
		font-semibold
		tracking-tight
	`,
}: {
	className?: string;
	markClassName?: string;
	nameClassName?: string;
}) {
	return (
		<a
			className={className}
			href="/place-et-marque"
		>
			<PlaceEtMarqueMark className={markClassName} />
			<span className={nameClassName}>
				Place et Marque
			</span>
		</a>
	);
}
