'use client';

import { Suspense } from 'react';
import { CatalogSearchExperience } from '../../../components/catalog/CatalogSearchExperience';

export default function PlaceEtMarqueSearchPage() {
	return (
		<Suspense
			fallback={
				<div className="-mx-gutter px-gutter">
					<div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
					<div className="mt-5 h-10 w-64 animate-pulse rounded bg-slate-200" />
					<div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
						{Array.from({ length: 9 }).map((_, index) => (
							<div
								className="aspect-square animate-pulse rounded-2xl bg-slate-200"
								key={index}
							/>
						))}
					</div>
				</div>
			}
		>
			<CatalogSearchExperience />
		</Suspense>
	);
}
