'use client';

import type { RefObject } from 'react';
import { SearchIcon } from '../icons/SearchIcon';
import { useCatalogSearch } from './CatalogSearchContext';

export function CatalogSearchField({
	inputId,
	inputRef,
	showShortcut = false,
	variant = 'header',
}: {
	inputId: string;
	inputRef: RefObject<HTMLInputElement | null>;
	showShortcut?: boolean;
	variant?: 'header' | 'page';
}) {
	const { query, setQuery, committedQuery, submit } = useCatalogSearch();
	const header = variant === 'header';

	return (
		<form
			className={
				header
					? 'relative min-w-0 flex-1'
					: `
						relative
						min-w-0
						flex-1
					`
			}
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
			role="search"
		>
			<label
				className="relative block min-w-0"
				htmlFor={inputId}
			>
				<span className="sr-only">Search products</span>
				<SearchIcon
					className="
						pointer-events-none
						absolute
						left-3.5
						top-1/2
						h-4
						w-4
						-translate-y-1/2
						text-slate-400
					"
				/>
				<input
					className={
						header
							? `
								w-full
								rounded-full
								border
								border-slate-300
								bg-frost
								py-2.5
								pl-10
								pr-16
								text-sm
								text-ink
								outline-none
								transition
								placeholder:text-slate-400
								focus:border-ink
								focus:bg-white
							`
							: `
								w-full
								rounded-xl
								border
								border-slate-300
								bg-frost
								py-3
								pl-11
								pr-4
								text-sm
								text-ink
								outline-none
								transition
								placeholder:text-slate-400
								focus:border-ink
								focus:bg-white
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
					ref={inputRef}
					type="search"
					value={query}
				/>
				{showShortcut
					? (
						<kbd
							className="
								absolute
								right-3
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
		</form>
	);
}
