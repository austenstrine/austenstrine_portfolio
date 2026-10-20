import { glossaryTerms } from '../../../lib/glossary';

export default function PlaceEtMarqueGuidePage() {
	return (
		<div
			className="
				flex
				flex-col
				gap-8
			"
		>
			<div>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					Guide
				</h1>
				<p
					className="
						mt-2
						max-w-2xl
						text-slate-600
					"
				>
					Plain-language notes for Place et Marque terms that are easy to trip over.
					In the catalog, a
					{' '}
					<span className="font-semibold">
						?
					</span>
					{' '}
					next to a term opens a short definition.
				</p>
			</div>

			<nav
				className="
					flex
					flex-wrap
					gap-x-4
					gap-y-2
					text-sm
					font-semibold
				"
			>
				{glossaryTerms.map((term) => (
					<a
						className="text-sky hover:underline"
						key={term.id}
						href={`#${term.id}`}
					>
						{term.term}
					</a>
				))}
			</nav>

			<div
				className="
					flex
					flex-col
					gap-4
				"
			>
				{glossaryTerms.map((term) => (
					<section
						className="
							scroll-mt-8
							rounded-2xl
							border
							border-slate-200
							bg-white
							p-5
						"
						key={term.id}
						id={term.id}
					>
						<h2 className="text-lg font-semibold">
							{term.term}
						</h2>
						<p
							className="
								mt-1
								text-sm
								font-medium
								text-slate-700
							"
						>
							{term.short}
						</p>
						<p
							className="
								mt-3
								text-sm
								leading-relaxed
								text-slate-600
							"
						>
							{term.long}
						</p>
					</section>
				))}
			</div>
		</div>
	);
}
