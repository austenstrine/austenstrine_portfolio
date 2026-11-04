import type { MouseEvent } from 'react';
import {
	CATALOG_WORKSPACE_LABELS,
	type ProductEditorIntent,
	type ProductEditorSurface,
} from '../../lib/catalog-product-form';

type CatalogWorkspaceSwitcherProps = {
	active: ProductEditorSurface;
	intent?: ProductEditorIntent;
	productId?: string;
	/** Softer chrome for standard edit/create so it does not compete with the form. */
	quiet?: boolean;
	/** When true, confirm before navigating away. */
	confirmLeave?: boolean;
};

export function CatalogWorkspaceSwitcher({
	active,
	intent = 'create',
	productId,
	quiet = false,
	confirmLeave = false,
}: CatalogWorkspaceSwitcherProps) {
	const other: ProductEditorSurface = active === 'standard' ? 'advanced' : 'standard';

	let href = other === 'standard'
		? '/place-et-marque/products/new'
		: '/place-et-marque/products/configure';

	if(intent === 'edit' && productId) {
		href = other === 'standard'
			? `/place-et-marque/products/${productId}/edit`
			: `/place-et-marque/products/${productId}/configure`;
	}

	const onNavigate = (event: MouseEvent<HTMLAnchorElement>) => {
		if(!confirmLeave) {
			return;
		}
		const ok = window.confirm(
			`Leave this form for ${CATALOG_WORKSPACE_LABELS[other].short}? Unsaved changes will be lost.`,
		);
		if(!ok) {
			event.preventDefault();
		}
	};

	if(quiet) {
		return (
			<p
				className="
					text-sm
					text-slate-500
				"
			>
				Need packaging rules or quantity breaks first?
				{' '}
				<a
					className="
						font-semibold
						text-sky
						hover:underline
					"
					href={href}
					onClick={onNavigate}
				>
					Open
					{' '}
					{CATALOG_WORKSPACE_LABELS[other].short}
				</a>
			</p>
		);
	}

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
				onClick={onNavigate}
			>
				Switch to
				{' '}
				{CATALOG_WORKSPACE_LABELS[other].short}
			</a>
		</div>
	);
}
