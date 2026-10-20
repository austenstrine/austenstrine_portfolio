'use client';

import { useEffect, useState } from 'react';
import { listMyVendors } from '../../lib/catalog-api';
import { useSession } from '../../lib/useSession';

export function CatalogEmptyActions() {
	const { user, loading } = useSession();
	const [hasVendor, setHasVendor] = useState<boolean | null>(null);

	useEffect(() => {
		if(loading) {
			return;
		}

		if(!user) {
			setHasVendor(false);
			return;
		}

		listMyVendors()
			.then((rows) => {
				setHasVendor(rows.length > 0);
			})
			.catch(() => {
				setHasVendor(false);
			});
	}, [loading, user]);

	const showCreateVendor = hasVendor === false;

	return (
		<>
			<p
				className="
					mt-2
					text-sm
					text-slate-600
				"
			>
				{showCreateVendor
					? 'No seed data—create a vendor, add units and categories, then list a product.'
					: 'Add units and categories if you need them, then list a product.'
				}
			</p>
			<div
				className="
					mt-4
					flex
					flex-wrap
					gap-3
				"
			>
				{showCreateVendor
					? (
						<a
							className="
								inline-flex
								rounded-full
								bg-ink
								px-4
								py-2
								text-sm
								font-semibold
								text-white
								hover:bg-sky
							"
							href="/place-et-marque/vendors"
						>
							Create a vendor
						</a>
					)
					: null
				}
				<a
					className="
						inline-flex
						rounded-full
						border
						border-slate-300
						px-4
						py-2
						text-sm
						font-semibold
						text-ink
						hover:border-sky
						hover:text-sky
					"
					href="/place-et-marque/products/new"
				>
					New product
				</a>
			</div>
		</>
	);
}
