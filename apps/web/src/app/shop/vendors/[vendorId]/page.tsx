'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMyVendor, type VendorDetail } from '../../../../lib/catalog-api';
import { useSession } from '../../../../lib/useSession';

export default function VendorDetailPage() {
	const params = useParams<{ vendorId: string }>();
	const vendorId = params.vendorId;
	const { user, loading: sessionLoading } = useSession();
	const [vendor, setVendor] = useState<VendorDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if(!user || !vendorId) {
			setLoading(false);
			return;
		}

		setLoading(true);
		getMyVendor(vendorId)
			.then(setVendor)
			.catch((loadError) => {
				setVendor(null);
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Could not load vendor organization.',
				);
			})
			.finally(() => setLoading(false));
	}, [user, vendorId]);

	return (
		<div className="flex flex-col gap-6">
			<a href="/shop/vendors" className="text-sm font-semibold text-sky hover:underline">
				← Back to vendors
			</a>

			{sessionLoading || loading ? <p className="text-sm text-slate-500">Loading…</p> : null}

			{!sessionLoading && !user ? (
				<p className="text-sm text-amber-800">
					Sign in to view this vendor organization.{' '}
					<a href="/auth/login" className="font-semibold text-sky hover:underline">
						Sign in
					</a>
				</p>
			) : null}

			{error ? <p className="text-sm text-red-700">{error}</p> : null}

			{vendor ? (
				<>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							{vendor.myRole}
						</p>
						<h1 className="mt-1 text-3xl font-semibold tracking-tight">{vendor.name}</h1>
						<p className="mt-1 text-slate-600">{vendor.slug}</p>
					</div>

					<section
						className="
							rounded-2xl
							border
							border-slate-200
							bg-white
							p-5
						"
					>
						<h2 className="text-lg font-semibold">Members</h2>
						<ul className="mt-4 flex flex-col gap-3">
							{vendor.members.map((member) => (
								<li
									key={member.userId}
									className="
										flex
										flex-wrap
										items-center
										justify-between
										gap-2
										rounded-xl
										border
										border-slate-100
										p-3
									"
								>
									<div>
										<p className="font-semibold">{member.email}</p>
										<p className="text-xs text-slate-500">
											Joined {new Date(member.joinedAt).toLocaleDateString()}
										</p>
									</div>
									<span
										className="
											rounded-full
											bg-slate-100
											px-3
											py-1
											text-xs
											font-semibold
											uppercase
											tracking-wide
											text-slate-700
										"
									>
										{member.role}
									</span>
								</li>
							))}
						</ul>
					</section>

					<section
						className="
							rounded-2xl
							border
							border-slate-200
							bg-white
							p-5
						"
					>
						<h2 className="text-lg font-semibold">Catalog</h2>
						<p className="mt-2 text-sm text-slate-600">
							{vendor.productCount} product{vendor.productCount === 1 ? '' : 's'} in this
							organization.
						</p>
						<a
							href={`/shop/search?vendor=${encodeURIComponent(vendor.slug)}`}
							className="mt-3 inline-block text-sm font-semibold text-sky hover:underline"
						>
							View products
						</a>
					</section>
				</>
			) : null}
		</div>
	);
}
