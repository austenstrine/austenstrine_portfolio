'use client';

import { Suspense } from 'react';
import { CatalogSearchExperience } from '../../../components/catalog/CatalogSearchExperience';

export default function PlaceEtMarqueSearchPage() {
	return (
		<Suspense
			fallback={
				<div className="-mx-6 px-6">
					<div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
					<div className="mt-5 h-10 w-64 animate-pulse rounded bg-slate-200" />
					<div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
						{Array.from({ length: 9 }).map((_, index) => (
							<div key={index} className="aspect-[5/3] animate-pulse rounded-lg bg-slate-200" />
						))}
					</div>
				</div>
			}
		>
			<CatalogSearchExperience />
		</Suspense>
	);
}
