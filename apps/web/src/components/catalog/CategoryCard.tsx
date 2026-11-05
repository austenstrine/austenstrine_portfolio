import type { CatalogCategoryRow, CatalogProductSummary } from '../../lib/catalog-api';
import type { NestedCategory } from '../../lib/category-tree';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { CatalogCover } from './CatalogCover';

export type CategoryCardVariant = 'hero' | 'wide' | 'compact';

export type CategoryNestedImage = {
	src: string;
	alt: string;
};

export const CATEGORY_BENTO_VARIANTS: CategoryCardVariant[] = [
	'hero',
	'compact',
	'compact',
	'wide',
	'compact',
	'compact',
	'hero',
	'wide',
	'compact',
	'compact',
	'compact',
	'compact',
];

function categoryMark(name: string) {
	const trimmed = name.trim();
	return trimmed ? trimmed[0].toUpperCase() : 'C';
}

function nestedLimit(variant: CategoryCardVariant) {
	if(variant === 'compact') {
		return 1;
	}
	return 3;
}

export function nestedCategoryImages(
	category: NestedCategory<CatalogCategoryRow>,
	products: CatalogProductSummary[],
	variant: CategoryCardVariant,
): CategoryNestedImage[] {
	const limit = nestedLimit(variant);
	const seen = new Set<string>();
	const parent = category.imageUrl?.trim();
	if(parent) {
		seen.add(parent);
	}
	const out: CategoryNestedImage[] = [];

	const push = (src: string | null | undefined, alt: string) => {
		const value = src?.trim();
		if(!value || seen.has(value) || out.length >= limit) {
			return;
		}
		seen.add(value);
		out.push({ src: value, alt });
	};

	const walk = (nodes: NestedCategory<CatalogCategoryRow>[]) => {
		for(const node of nodes) {
			push(node.imageUrl, node.name);
			if(out.length >= limit) {
				return;
			}
			walk(node.children);
		}
	};

	walk(category.children);
	for(const product of products) {
		for(const src of product.imageUrls ?? []) {
			push(src, product.title);
			if(out.length >= limit) {
				return out;
			}
		}
	}
	return out;
}

function CoverFallback({ name }: { name: string }) {
	return (
		<div
			className="
				absolute
				inset-0
				flex
				flex-col
				justify-between
				bg-frost
				p-4
			"
		>
			<p
				className="
					text-[10px]
					font-semibold
					uppercase
					tracking-[0.18em]
					text-asgreen
				"
			>
				Category
			</p>
			<p
				className="
					font-semibold
					tracking-tight
					text-ink/80
				"
				style={{ fontSize: '2.35rem', lineHeight: 0.9 }}
			>
				{categoryMark(name)}
			</p>
		</div>
	);
}

function NestedThumbs({
	images,
	layout,
}: {
	images: CategoryNestedImage[];
	layout: 'fan' | 'stack' | 'inset';
}) {
	if(images.length === 0) {
		return null;
	}

	if(layout === 'inset') {
		const image = images[0];
		return (
			<div
				aria-hidden="true"
				className="
					absolute
					right-3
					top-3
					hidden
					h-12
					w-12
					overflow-hidden
					rounded-xl
					ring-2
					ring-white
					sm:block
				"
			>
				<CatalogCover
					alt=""
					className="
						h-full
						w-full
						object-cover
					"
					fallback={<div className="h-full w-full bg-frost" />}
					height={160}
					src={image.src}
					width={160}
				/>
			</div>
		);
	}

	if(layout === 'stack') {
		return (
			<div
				aria-hidden="true"
				className="
					absolute
					right-3
					top-1/2
					isolate
					flex
					-translate-y-1/2
					flex-col
				"
			>
				{images.map((image, index) =>
					(
						<div
							className={
								index === 0
									? `
										relative
										z-[3]
										h-14
										w-12
										overflow-hidden
										rounded-xl
										ring-2
										ring-white
										sm:h-16
										sm:w-14
									`
									: index === 1
										? `
											relative
											z-[2]
											-mt-4
											ml-3
											h-14
											w-12
											overflow-hidden
											rounded-xl
											ring-2
											ring-white
											sm:h-16
											sm:w-14
										`
										: `
											relative
											z-[1]
											-mt-4
											h-14
											w-12
											overflow-hidden
											rounded-xl
											ring-2
											ring-white
											sm:h-16
											sm:w-14
										`
							}
							key={`${image.src}-${index}`}
						>
							<CatalogCover
								alt=""
								className="
									h-full
									w-full
									object-cover
								"
								fallback={<div className="h-full w-full bg-frost" />}
								height={240}
								src={image.src}
								width={180}
							/>
						</div>
					)
				)}
			</div>
		);
	}

	return (
		<div
			aria-hidden="true"
			className="
				absolute
				bottom-4
				right-4
				isolate
				flex
				items-end
			"
		>
			{images.map((image, index) =>
				(
					<div
						className={
							index === 0
								? `
									relative
									z-[3]
									h-14
									w-14
									-rotate-6
									overflow-hidden
									rounded-xl
									ring-2
									ring-white
									sm:h-[4.5rem]
									sm:w-[4.5rem]
								`
								: index === 1
									? `
										relative
										z-[2]
										-ml-4
										h-14
										w-14
										rotate-3
										overflow-hidden
										rounded-xl
										ring-2
										ring-white
										sm:h-[4.5rem]
										sm:w-[4.5rem]
									`
									: `
										relative
										z-[1]
										-ml-4
										h-14
										w-14
										-rotate-2
										overflow-hidden
										rounded-xl
										ring-2
										ring-white
										sm:h-[4.5rem]
										sm:w-[4.5rem]
									`
						}
						key={`${image.src}-${index}`}
					>
						<CatalogCover
							alt=""
							className="
								h-full
								w-full
								object-cover
							"
							fallback={<div className="h-full w-full bg-frost" />}
							height={200}
							src={image.src}
							width={200}
						/>
					</div>
				)
			)}
		</div>
	);
}

export function CategoryCard({
	category,
	nested = [],
	variant = 'compact',
}: {
	category: CatalogCategoryRow;
	nested?: CategoryNestedImage[];
	variant?: CategoryCardVariant;
}) {
	const productCount = category._count?.products ?? 0;
	const childCount = category._count?.children ?? 0;
	const coverWidth = variant === 'compact' ? 640 : 1200;
	const coverHeight = variant === 'hero' ? 900 : variant === 'wide' ? 640 : 800;

	return (
		<a
			className={
				variant === 'hero'
					? `
						group
						relative
						col-span-2
						flex
						h-full
						min-h-[16rem]
						overflow-hidden
						rounded-2xl
						border
						border-slate-200
						bg-white
						transition
						hover:border-asgreen/40
						hover:shadow-[0_8px_24px_rgba(13,27,42,0.08)]
						lg:row-span-2
						lg:min-h-0
					`
					: variant === 'wide'
						? `
							group
							relative
							col-span-2
							flex
							h-full
							min-h-[12rem]
							overflow-hidden
							rounded-2xl
							border
							border-slate-200
							bg-white
							transition
							hover:border-asgreen/40
							hover:shadow-[0_8px_24px_rgba(13,27,42,0.08)]
							lg:min-h-0
						`
						: `
							group
							relative
							flex
							h-full
							aspect-[4/5]
							overflow-hidden
							rounded-2xl
							border
							border-slate-200
							bg-white
							transition
							hover:border-asgreen/40
							hover:shadow-[0_8px_24px_rgba(13,27,42,0.08)]
							lg:aspect-auto
							lg:min-h-0
						`
			}
			href={`/place-et-marque/search?category=${encodeURIComponent(category.slug)}`}
		>
			<div
				className="
					absolute
					inset-0
					overflow-hidden
					bg-frost
				"
			>
				<CatalogCover
					alt={category.name}
					className="
						absolute
						inset-0
						h-full
						w-full
						object-cover
						transition
						duration-300
						group-hover:scale-[1.03]
					"
					fallback={<CoverFallback name={category.name} />}
					height={coverHeight}
					src={category.imageUrl}
					width={coverWidth}
				/>
			</div>
			<div
				className="
					absolute
					inset-0
					bg-gradient-to-t
					from-sky/80
					via-sky/25
					to-transparent
				"
			/>
			<NestedThumbs
				images={nested}
				layout={
					variant === 'hero'
						? 'fan'
						: variant === 'wide'
							? 'stack'
							: 'inset'
				}
			/>
			<div
				className={
					variant === 'hero'
						? `
							relative
							mt-auto
							flex
							w-[min(100%,calc(100%-6.5rem))]
							items-end
							justify-between
							gap-3
							p-4
							sm:p-5
						`
						: variant === 'wide'
							? `
								relative
								mt-auto
								flex
								w-[min(100%,calc(100%-5.5rem))]
								items-end
								justify-between
								gap-3
								p-4
							`
							: `
								relative
								mt-auto
								flex
								items-end
								justify-between
								gap-2
								p-3
							`
				}
			>
				<div className="min-w-0">
					<p
						className={
							variant === 'hero'
								? `
									text-xl
									font-semibold
									tracking-tight
									text-white
									sm:text-3xl
								`
								: variant === 'wide'
									? `
										text-lg
										font-semibold
										tracking-tight
										text-white
										sm:text-xl
									`
									: `
										line-clamp-2
										text-sm
										font-semibold
										text-white
									`
						}
					>
						{category.name}
					</p>
					{productCount > 0
						? (
							<p
								className="
									mt-1
									text-[12px]
									text-white/75
								"
							>
								{`${productCount.toLocaleString()} product${productCount === 1 ? '' : 's'}`}
							</p>
						)
						: childCount > 0
							? (
								<p
									className="
										mt-1
										text-[12px]
										text-white/75
									"
								>
									{`${childCount.toLocaleString()} collection${childCount === 1 ? '' : 's'}`}
								</p>
							)
							: null
					}
				</div>
				<ArrowRightIcon
					className={
						variant === 'compact'
							? `
								mb-0.5
								h-3.5
								w-3.5
								shrink-0
								text-asgreen
							`
							: `
								mb-1
								h-4
								w-4
								shrink-0
								text-asgreen
							`
					}
				/>
			</div>
		</a>
	);
}
