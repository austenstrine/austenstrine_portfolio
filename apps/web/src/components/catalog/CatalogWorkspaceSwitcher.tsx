import type { MouseEvent } from 'react';
import {
	CATALOG_WORKSPACE_LABELS,
	type ProductEditorIntent,
	type ProductEditorSurface,
} from '../../lib/catalog-product-form';
import {
	productCreateHref,
	productEditHref,
} from '../../lib/vendor-ref';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';

type CatalogWorkspaceSwitcherProps = {
	active: ProductEditorSurface;
	intent?: ProductEditorIntent;
	/** Create: preserve ?vendorId= (slug preferred). */
	vendorRef?: string | null;
	categoryId?: string | null;
	/** Edit: human path /<vendorSlug>/<productSlug>/(edit|configure). */
	vendorSlug?: string | null;
	productSlug?: string | null;
	/** Softer chrome for standard edit/create so it does not compete with the form. */
	quiet?: boolean;
	/** When true, confirm before navigating away. */
	confirmLeave?: boolean;
};

export function CatalogWorkspaceSwitcher({
	active,
	intent = 'create',
	vendorRef = null,
	categoryId = null,
	vendorSlug = null,
	productSlug = null,
	quiet = false,
	confirmLeave = false,
}: CatalogWorkspaceSwitcherProps) {
	const other: ProductEditorSurface = active === 'standard' ? 'advanced' : 'standard';

	let href = productCreateHref({
		surface: other,
		vendorRef,
		categoryId,
	});

	if(
		intent === 'edit'
		&& vendorSlug?.trim()
		&& productSlug?.trim()
	) {
		href = productEditHref(
			{
				vendorSlug: vendorSlug.trim(),
				productSlug: productSlug.trim(),
			},
			other,
		);
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

	const switchLabel = CATALOG_WORKSPACE_LABELS[other].short;

	if(quiet) {
		return (
			<a
				aria-label={switchLabel}
				className="
					inline-flex
					h-9
					w-9
					items-center
					justify-center
					gap-1.5
					rounded-full
					border
					border-slate-300
					bg-white
					text-sm
					font-semibold
					text-ink
					hover:border-sky
					hover:text-sky
					sm:h-auto
					sm:w-auto
					sm:px-3
					sm:py-1.5
				"
				href={href}
				onClick={onNavigate}
				title={switchLabel}
			>
				<span
					className="
						hidden
						sm:inline
					"
				>
					{switchLabel}
				</span>
				<ArrowRightIcon
					className="
						h-3.5
						w-3.5
						shrink-0
					"
				/>
			</a>
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
				aria-label={switchLabel}
				className="
					inline-flex
					h-9
					w-9
					shrink-0
					items-center
					justify-center
					gap-1.5
					rounded-full
					border
					border-slate-300
					px-0
					text-xs
					font-semibold
					text-slate-700
					hover:border-sky
					hover:text-sky
					sm:h-auto
					sm:w-auto
					sm:px-3
					sm:py-1.5
				"
				href={href}
				onClick={onNavigate}
				title={switchLabel}
			>
				<span
					className="
						hidden
						sm:inline
					"
				>
					{switchLabel}
				</span>
				<ArrowRightIcon
					className="
						h-3.5
						w-3.5
						shrink-0
					"
				/>
			</a>
		</div>
	);
}
