import {
	CATALOG_WORKSPACE_LABELS,
	type CatalogWorkspace,
} from '../../lib/catalog-product-form';

type CatalogWorkspaceSwitcherProps = {
	active: CatalogWorkspace;
};

export function CatalogWorkspaceSwitcher({ active }: CatalogWorkspaceSwitcherProps) {
	const other: CatalogWorkspace = active === 'standard' ? 'inventory' : 'standard';
	const href = other === 'standard' ? '/place-et-marque/products/new' : '/place-et-marque/products/configure';

	return (
		<div
			className="
				flex
				flex-wrap
				items-center
				justify-between
				gap-3
				rounded-2xl
				border
				border-slate-200
				bg-white
				px-4
				py-3
			"
		>
			<div className="min-w-0">
				<p
					className="
						text-xs
						font-semibold
						uppercase
						tracking-[0.2em]
						text-slate-500
					"
				>
					Catalog workspace
				</p>
				<p
					className="
						mt-1
						text-sm
						font-semibold
						text-ink
					"
				>
					{CATALOG_WORKSPACE_LABELS[active].title}
				</p>
			</div>
			<a
				className="
					shrink-0
					rounded-full
					border
					border-slate-300
					px-3
					py-1.5
					text-xs
					font-semibold
					text-slate-700
					hover:border-sky
					hover:text-sky
				"
				href={href}
			>
				Switch to {CATALOG_WORKSPACE_LABELS[other].short}
			</a>
		</div>
	);
}
