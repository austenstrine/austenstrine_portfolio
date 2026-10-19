'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import {
	createVendor,
	listMyVendors,
	type VendorSummary,
} from '../../../lib/catalog-api';
import { safeNextPath } from '../../../lib/accessGate';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { UrlSlugField } from '../../../components/catalog/UrlSlugField';

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function VendorManageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const nextPath = safeNextPath(searchParams.get('next'), '');
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [slugTouched, setSlugTouched] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			setVendors(await listMyVendors());
		}
		catch {
			setVendors([]);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	useEffect(() => {
		if(loading || !nextPath || vendors.length === 0) {
			return;
		}
		router.replace(nextPath);
	}, [loading, nextPath, vendors.length, router]);

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
			if(nextPath) {
				router.push(nextPath);
				return;
			}
			await refresh();
		}
		catch(submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Could not create vendor organization.',
			);
		}
		finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className="
				flex
				flex-col
				gap-8
			"
		>
			<div>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					Vendor organizations
				</h1>
				<p
					className="
						mt-2
						max-w-2xl
						text-slate-600
					"
				>
					Create a vendor organization and become its owner. That membership unlocks product
					management for that vendor&apos;s catalog.
				</p>
				{nextPath
					? (
							<p
								className="
									mt-3
									rounded-xl
									border
									border-sky/30
									bg-sky/5
									px-4
									py-3
									text-sm
									text-slate-700
								"
							>
								After you join or create a vendor, we&apos;ll send you back to continue
								where you left off.
							</p>
						)
					: null}
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
				<h2 className="text-lg font-semibold">
					Create organization
				</h2>
				<p
					className="
						mt-2
						text-sm
						text-slate-600
					"
				>
					If the vendor organization already exists, ask a current member to send you an
					invite instead of creating a duplicate.
				</p>
				<form
					className="
						mt-4
						flex
						flex-col
						gap-4
					"
					onSubmit={onSubmit}
				>
					<label className="block text-sm">
						<span className="font-semibold">
							Organization name
						</span>
						<input
							className="
								mt-1
								w-full
								rounded-lg
								border
								border-slate-300
								px-3
								py-2
							"
							value={name}
							onChange={(event) => onNameChange(event.target.value)}
							required
							minLength={2}
							maxLength={120}
							placeholder="Demo Supply Co."
						/>
					</label>

					<UrlSlugField
						label="Store URL"
						value={slug}
						onChange={(next) => {
							setSlugTouched(true);
							setSlug(slugify(next));
						}}
						prefixPath="/shop"
						placeholder="demo-supply"
						helpText="Choose a short public address for your store. Product pages will look like …/shop/your-store/product-name."
					/>

					{error
						? (
								<p className="text-sm text-red-700">
									{error}
								</p>
							)
						: null}

					<button
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
						type="submit"
						disabled={submitting}
					>
						{submitting ? 'Creating…' : 'Create vendor'}
					</button>
				</form>
			</section>

			<section
				className="
					flex
					flex-col
					gap-3
				"
			>
				<h2 className="text-lg font-semibold">
					Your organizations
				</h2>
				{loading
					? (
							<p className="text-sm text-slate-500">
								Loading…
							</p>
						)
					: null}
				{!loading && vendors.length === 0
					? (
							<p className="text-sm text-slate-500">
								You are not a member of any vendor organization yet. Create one above,
								or wait for an invite from an existing vendor.
							</p>
						)
					: null}
				{vendors.map((vendor) => (
					<a
						className="
							rounded-xl
							border
							border-slate-200
							bg-white
							p-4
							hover:border-sky
						"
						key={vendor.id}
						href={`/shop/vendors/${vendor.id}`}
					>
						<div
							className="
								flex
								flex-wrap
								items-center
								justify-between
								gap-2
							"
						>
							<div>
								<p className="font-semibold">
									{vendor.name}
								</p>
								<p className="text-sm text-slate-600">
									/shop/{vendor.slug}
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
								{vendor.myRole}
							</span>
						</div>
						<p
							className="
								mt-2
								text-xs
								text-slate-500
							"
						>
							{vendor.memberCount} member{vendor.memberCount === 1 ? '' : 's'} ·{' '}
							{vendor.productCount} product{vendor.productCount === 1 ? '' : 's'}
						</p>
					</a>
				))}
			</section>
		</div>
	);
}

export default function VendorManagePage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess reasonKey="vendors">
				<VendorManageContent />
			</RequireAccess>
		</Suspense>
	);
}
