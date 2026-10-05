'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
	createVendor,
	listMyVendors,
	type VendorSummary,
} from '../../../lib/catalog-api';
import { useSession } from '../../../lib/useSession';

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export default function VendorManagePage() {
	const { user, loading: sessionLoading } = useSession();
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [loading, setLoading] = useState(false);
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [slugTouched, setSlugTouched] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const refresh = useCallback(async () => {
		if(!user) {
			setVendors([]);
			return;
		}

		setLoading(true);
		try {
			setVendors(await listMyVendors());
		} catch {
			setVendors([]);
		} finally {
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const onNameChange = (value: string) => {
		setName(value);
		if(!slugTouched) {
			setSlug(slugify(value));
		}
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			await createVendor({ name: name.trim(), slug: slug.trim() });
			setName('');
			setSlug('');
			setSlugTouched(false);
			await refresh();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Could not create vendor organization.',
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-semibold tracking-tight">Vendor organizations</h1>
				<p className="mt-2 max-w-2xl text-slate-600">
					Create a vendor organization and become its owner. That membership unlocks product
					management and quick edit for that vendor&apos;s catalog.
				</p>
			</div>

			{sessionLoading ? <p className="text-sm text-slate-500">Checking session…</p> : null}

			{!sessionLoading && !user ? (
				<div
					className="
						rounded-2xl
						border
						border-amber-200
						bg-amber-50
						p-5
						text-sm
						text-amber-900
					"
				>
					<p>Sign in to create or manage vendor organizations.</p>
					<a href="/auth/login" className="mt-2 inline-block font-semibold text-sky hover:underline">
						Go to sign in
					</a>
				</div>
			) : null}

			{user ? (
				<>
					<p className="text-sm text-slate-600">Signed in as {user.email}</p>

					<section
						className="
							rounded-2xl
							border
							border-slate-200
							bg-white
							p-5
						"
					>
						<h2 className="text-lg font-semibold">Create organization</h2>
						<form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
							<label className="block text-sm">
								<span className="font-semibold">Organization name</span>
								<input
									value={name}
									onChange={(event) => onNameChange(event.target.value)}
									required
									minLength={2}
									maxLength={120}
									placeholder="Demo Supply Co."
									className="
										mt-1
										w-full
										rounded-lg
										border
										border-slate-300
										px-3
										py-2
									"
								/>
							</label>

							<label className="block text-sm">
								<span className="font-semibold">Slug</span>
								<input
									value={slug}
									onChange={(event) => {
										setSlugTouched(true);
										setSlug(slugify(event.target.value));
									}}
									required
									minLength={2}
									maxLength={80}
									pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
									placeholder="demo-supply"
									className="
										mt-1
										w-full
										rounded-lg
										border
										border-slate-300
										px-3
										py-2
									"
								/>
								<span className="mt-1 block text-xs text-slate-500">
									Used in product URLs, e.g. /shop/{slug || 'your-slug'}/…
								</span>
							</label>

							{error ? <p className="text-sm text-red-700">{error}</p> : null}

							<button
								type="submit"
								disabled={submitting}
								className="
									self-start
									rounded-full
									bg-ink
									px-4
									py-2.5
									text-sm
									font-semibold
									text-white
									hover:bg-sky
									disabled:opacity-60
								"
							>
								{submitting ? 'Creating…' : 'Create vendor'}
							</button>
						</form>
					</section>

					<section className="flex flex-col gap-3">
						<h2 className="text-lg font-semibold">Your organizations</h2>
						{loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
						{!loading && vendors.length === 0 ? (
							<p className="text-sm text-slate-500">
								You are not a member of any vendor organization yet.
							</p>
						) : null}
						{vendors.map((vendor) => (
							<a
								key={vendor.id}
								href={`/shop/vendors/${vendor.id}`}
								className="
									rounded-xl
									border
									border-slate-200
									bg-white
									p-4
									hover:border-sky
								"
							>
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div>
										<p className="font-semibold">{vendor.name}</p>
										<p className="text-sm text-slate-600">{vendor.slug}</p>
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
										{vendor.myRole}
									</span>
								</div>
								<p className="mt-2 text-xs text-slate-500">
									{vendor.memberCount} member{vendor.memberCount === 1 ? '' : 's'} ·{' '}
									{vendor.productCount} product{vendor.productCount === 1 ? '' : 's'}
								</p>
							</a>
						))}
					</section>
				</>
			) : null}
		</div>
	);
}
