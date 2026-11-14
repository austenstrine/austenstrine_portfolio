import Link from 'next/link';
import {
	Fragment,
	type ReactNode,
} from 'react';

export type MarketplaceBreadcrumbCrumb = {
	key: string;
	label: ReactNode;
	/** Navigable link. Omit with `onClick` for in-place reset; omit both for the current crumb. */
	href?: string;
	/** In-place breadcrumb action (search filter clear). Mutually exclusive with `href`. */
	onClick?: () => void;
};

const crumbLinkClassName = `
	font-semibold
	text-sky
	underline
	underline-offset-2
`;

const crumbCurrentClassName = `
	font-semibold
	text-ink
`;

/**
 * Shared Place et Marque breadcrumb trail.
 * Separators are always `/` (not chevrons). Navigable crumbs use traditional sky+underline;
 * the current crumb is ink. Use this everywhere — do not hand-roll breadcrumb markup.
 */
export function MarketplaceBreadcrumb({
	crumbs,
	className = '',
}: {
	crumbs: MarketplaceBreadcrumbCrumb[];
	className?: string;
}) {
	if(crumbs.length === 0) {
		return null;
	}

	return (
		<nav
			aria-label="Breadcrumb"
			className={
				`
					text-[12px]
					text-slate-500
					${className}
				`.trim()
			}
		>
			<ol
				className="
					flex
					flex-wrap
					items-center
					gap-2
				"
			>
				{crumbs.map((crumb, index) => {
					const navigable = Boolean(crumb.href || crumb.onClick);
					return (
						<Fragment key={crumb.key}>
							{index > 0
								? (
									<li aria-hidden="true">
										/
									</li>
								)
								: null
							}
							<li
								className={navigable
									? undefined
									: crumbCurrentClassName
								}
							>
								{crumb.href
									? (
										<Link
											className={crumbLinkClassName}
											href={crumb.href}
										>
											{crumb.label}
										</Link>
									)
									: crumb.onClick
										? (
											<button
												className={crumbLinkClassName}
												onClick={crumb.onClick}
												type="button"
											>
												{crumb.label}
											</button>
										)
										: crumb.label
								}
							</li>
						</Fragment>
					);
				})}
			</ol>
		</nav>
	);
}
