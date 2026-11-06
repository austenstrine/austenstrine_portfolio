import type { ReactNode } from 'react';
import { EmailIcon } from '../icons/EmailIcon';
import { GlobeIcon } from '../icons/GlobeIcon';
import { MapPinIcon } from '../icons/MapPinIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import type { PublicVendor } from '../../lib/public-vendor-api';

function websiteLabel(url: string): string {
	try {
		const host = new URL(url).hostname.replace(/^www\./, '');
		return host || url;
	}
	catch {
		return url;
	}
}

type VendorStorefrontProfileProps = {
	vendor: PublicVendor;
};

export function VendorStorefrontProfile({ vendor }: VendorStorefrontProfileProps) {
	const contacts = [
		vendor.locationLabel
			? {
				key: 'location',
				href: null as string | null,
				label: vendor.locationLabel,
				icon: MapPinIcon,
			}
			: null,
		vendor.contactEmail
			? {
				key: 'email',
				href: `mailto:${vendor.contactEmail}`,
				label: vendor.contactEmail,
				icon: EmailIcon,
			}
			: null,
		vendor.contactPhone
			? {
				key: 'phone',
				href: `tel:${vendor.contactPhone.replace(/[^\d+]/g, '')}`,
				label: vendor.contactPhone,
				icon: PhoneIcon,
			}
			: null,
		vendor.websiteUrl
			? {
				key: 'website',
				href: vendor.websiteUrl,
				label: websiteLabel(vendor.websiteUrl),
				icon: GlobeIcon,
			}
			: null,
	].filter(Boolean) as Array<{
		key: string;
		href: string | null;
		label: string;
		icon: (props: { className?: string }) => ReactNode;
	}>;

	return (
		<section
			aria-labelledby="vendor-storefront-heading"
			className="
				-mx-gutter
				border-b
				border-slate-200
				bg-gradient-to-b
				from-sky/[0.06]
				to-transparent
				px-gutter
				pb-8
				pt-2
			"
		>
			<div className="mx-auto min-w-0 max-w-full">
				<nav className="text-[12px] text-slate-500" aria-label="Breadcrumb">
					<ol className="flex flex-wrap items-center gap-2">
						<li>
							<a
								className="hover:text-ink"
								href="/place-et-marque"
							>
								Place et Marque
							</a>
						</li>
						<li aria-hidden="true">/</li>
						<li className="text-ink">{vendor.name}</li>
					</ol>
				</nav>

				<div className="mt-5 min-w-0 max-w-3xl">
					<p
						className="
							text-xs
							font-semibold
							uppercase
							tracking-wide
							text-slate-500
						"
					>
						Seller
					</p>
					<h1
						className="
							mt-1
							min-w-0
							max-w-full
							text-3xl
							font-semibold
							tracking-tight
							text-ink
							md:text-4xl
						"
						id="vendor-storefront-heading"
					>
						{vendor.name}
					</h1>
					{vendor.tagline
						? (
							<p className="mt-2 text-base text-slate-700 md:text-lg">
								{vendor.tagline}
							</p>
						)
						: null
					}
					<p className="mt-2 text-sm text-slate-600">
						{vendor.productCount.toLocaleString()} product
						{vendor.productCount === 1
							? ''
							: 's'
						} in this catalog
					</p>
				</div>

				{contacts.length > 0
					? (
						<ul
							className="
								mt-5
								flex
								min-w-0
								flex-wrap
								gap-x-5
								gap-y-2
								text-sm
								text-slate-700
							"
						>
							{contacts.map((row) => {
								const Icon = row.icon;
								const inner = (
									<>
										<Icon className="h-4 w-4 shrink-0 text-sky" />
										<span className="min-w-0 break-words">
											{row.label}
										</span>
									</>
								);
								return (
									<li key={row.key}>
										{row.href
											? (
												<a
													className="
														inline-flex
														max-w-full
														items-center
														gap-2
														font-medium
														text-sky
														underline-offset-2
														hover:underline
													"
													href={row.href}
													{...(row.key === 'website'
														? {
															rel: 'noopener noreferrer',
															target: '_blank',
														}
														: {})}
												>
													{inner}
												</a>
											)
											: (
												<span className="inline-flex max-w-full items-center gap-2">
													{inner}
												</span>
											)
										}
									</li>
								);
							})}
						</ul>
					)
					: null
				}

				{vendor.about
					? (
						<div className="mt-6 max-w-3xl">
							<h2 className="text-sm font-semibold text-ink">
								About
							</h2>
							<p
								className="
									mt-2
									whitespace-pre-line
									text-sm
									leading-relaxed
									text-slate-700
									md:text-base
								"
							>
								{vendor.about}
							</p>
						</div>
					)
					: null
				}

				<p className="mt-6 text-sm">
					<a
						className="
							rounded
							font-semibold
							text-sky
							underline
							underline-offset-2
							focus:outline
							focus:outline-2
							focus:outline-offset-2
							focus:outline-sky
						"
						href="#catalog-results"
					>
						Shop this seller&apos;s products
					</a>
				</p>
			</div>
		</section>
	);
}
