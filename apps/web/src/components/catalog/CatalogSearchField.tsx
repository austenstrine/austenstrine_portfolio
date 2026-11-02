'use client';

import type { RefObject } from 'react';
import { SearchIcon } from '../icons/SearchIcon';
import { CatalogCategoryMenu } from './CatalogCategoryMenu';
import { useCatalogSearch } from './CatalogSearchContext';

export function CatalogSearchField({
	inputId,
	inputRef,
	showShortcut = false,
}: {
	inputId: string;
	inputRef: RefObject<HTMLInputElement | null>;
	showShortcut?: boolean;
}) {
	const {
		query,
		setQuery,
		committedQuery,
		submit,
		category,
		applyCategory,
		categories,
	} = useCatalogSearch();

	return (
		<form
			className="
				relative
				flex
				min-w-0
				flex-1
				items-stretch
				overflow-hidden
				rounded-full
				border
				border-slate-300
				bg-white
				transition
				focus-within:border-ink
			"
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
			role="search"
		>
			<CatalogCategoryMenu
				categories={categories}
				category={category}
				onChoose={applyCategory}
			/>
			<label
				className="relative min-w-0 flex-1"
				htmlFor={inputId}
			>
				<span className="sr-only">Search products</span>
				<input
					className={
						showShortcut
							? `
								h-full
								w-full
								appearance-none
								border-0
								bg-transparent
								py-2.5
								pl-3.5
								pr-12
								text-sm
								text-ink
								outline-none
								placeholder:text-slate-400
								[&::-webkit-search-cancel-button]:appearance-none
								[&::-webkit-search-decoration]:appearance-none
							`
							: `
								h-full
								w-full
								appearance-none
								border-0
								bg-transparent
								py-2.5
								pl-3.5
								pr-3
								text-sm
								text-ink
								outline-none
								placeholder:text-slate-400
								[&::-webkit-search-cancel-button]:appearance-none
								[&::-webkit-search-decoration]:appearance-none
							`
					}
					id={inputId}
					onChange={(event) => setQuery(event.target.value)}
					onFocus={(event) => event.currentTarget.select()}
					onKeyDown={(event) => {
						if(event.key === 'Escape') {
							if(query !== committedQuery) {
								setQuery(committedQuery);
								return;
							}
							event.currentTarget.blur();
						}
					}}
					placeholder="Search products, brands, and SKUs"
					ref={inputRef as RefObject<HTMLInputElement>}
					type="search"
					value={query}
				/>
				{showShortcut
					? (
						<kbd
							className="
								absolute
								right-2
								top-1/2
								hidden
								-translate-y-1/2
								rounded
								border
								border-slate-200
								bg-white
								px-1.5
								py-0.5
								text-[10px]
								font-semibold
								text-slate-500
								sm:inline
							"
						>
							/
						</kbd>
					)
					: null}
			</label>
			<button
				aria-label="Search"
				className="
					flex
					w-11
					shrink-0
					items-center
					justify-center
					border-l
					border-slate-300
					text-ink
					hover:bg-white
					hover:text-asgreen
				"
				type="submit"
			>
				<SearchIcon className="h-4 w-4" />
			</button>
		</form>
	);
}
