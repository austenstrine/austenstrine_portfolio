'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import {
	checkVendorLinkName,
	createVendor,
	listMyVendors,
	type VendorSummary,
} from '../../../lib/catalog-api';
import { safeNextPath } from '../../../lib/accessGate';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { DisclosurePrompt } from '../../../components/catalog/DisclosurePrompt';
import { UrlSlugField } from '../../../components/catalog/UrlSlugField';
import { PlusIcon } from '../../../components/icons/PlusIcon';

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
	const [createOpen, setCreateOpen] = useState(false);
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [slugTouched, setSlugTouched] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [linkCheckMessage, setLinkCheckMessage] = useState<string | null>(null);

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
		if(loading || vendors.length > 0) {
			return;
		}
		// No membership yet — creating (or waiting on an invite) is the needed path.
		setCreateOpen(true);
	}, [loading, vendors.length]);

	useEffect(() => {
		if(loading || !nextPath || vendors.length === 0) {
			return;
		}
		router.replace(nextPath);
	}, [loading, nextPath, vendors.length, router]);

	const onNameChange = (value: string) => {
		setName(value);
		if(!slugTouched) {
			const next = slugify(value);
			setSlug(next);
			setLinkCheckMessage(null);
		}
	};

	const onLinkNameChange = async (next: string) => {
		setSlugTouched(true);
		const normalized = slugify(next);
		setSlug(normalized);
		setLinkCheckMessage(null);
		if(normalized.length < 2) {
			return;
		}
		try {
			const check = await checkVendorLinkName(normalized);
			if(!check.available) {
				setLinkCheckMessage(check.message);
			}
		}
		catch {
			/* create submit still validates */
		}
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			const check = await checkVendorLinkName(slug.trim());
			if(!check.available) {
				setError(check.message ?? 'That name in the link is not available.');
				setSubmitting(false);
				return;
			}
			const created = await createVendor({ name: name.trim(), slug: slug.trim() });
			setName('');
			setSlug('');
			setSlugTouched(false);
			setLinkCheckMessage(null);
			setCreateOpen(false);
			if(nextPath) {
				router.push(nextPath);
				return;
			}
			router.push(`/place-et-marque/vendors/${created.slug}`);
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

	const closeCreate = () => {
		setCreateOpen(false);
		setError(null);
		setName('');
		setSlug('');
		setSlugTouched(false);
		setLinkCheckMessage(null);
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
					Open a vendor you belong to to manage its catalog. Membership as owner or editor
					unlocks product management for that vendor.
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
					: null
				}
			</div>

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
					: null
				}
				{!loading && vendors.length === 0
					? (
							<p className="text-sm text-slate-500">
								You are not a member of any vendor organization yet. Create one below,
								or wait for an invite from an existing vendor.
							</p>
						)
					: null
				}
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
						href={`/place-et-marque/vendors/${vendor.slug}`}
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
									/place-et-marque/{vendor.slug}
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
							{vendor.memberCount} member{vendor.memberCount === 1
								? ''
								: 's'
							} ·{' '}
							{vendor.productCount} product{vendor.productCount === 1
								? ''
								: 's'
							}
						</p>
					</a>
				))}
				{!loading && !createOpen
					? (
							<button
								type="button"
								aria-label="Create vendor organization"
								className="
									inline-flex
									self-end
									items-center
									justify-center
									rounded-xl
									border
									border-transparent
									px-4
									py-3
									text-slate-400
									transition
									hover:text-sky
								"
								onClick={() => setCreateOpen(true)}
							>
								<PlusIcon className="h-4 w-4" />
							</button>
						)
					: null
				}
			</section>

			{createOpen
				? (
						<section
							className="
								flex
								flex-col
								gap-3
							"
						>
							<div
								className="
									rounded-2xl
									border
									border-slate-200
									bg-white
									p-5
								"
							>
								<div
									className="
										flex
										flex-wrap
										items-start
										justify-between
										gap-3
									"
								>
									<div>
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
											If the vendor organization already exists, ask a current member to
											send you an invite instead of creating a duplicate.
										</p>
									</div>
									{vendors.length > 0
										? (
												<DisclosurePrompt
													question=""
													onExpand={() => undefined}
													expanded
													onCollapse={closeCreate}
													collapseLabel="Cancel"
												/>
											)
										: null
									}
								</div>
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
										label="Name in the link"
										value={slug}
										onChange={(next) => {
											void onLinkNameChange(next);
										}}
										prefixPath="/place-et-marque/vendors"
										placeholder="demo-supply-co"
										helpText="This becomes your organization page and store address. Product pages look like …/place-et-marque/your-store/product-name."
									/>

									{linkCheckMessage
										? (
												<p className="text-sm text-red-700">
													{linkCheckMessage}
												</p>
											)
										: null
									}

									{error
										? (
												<p className="text-sm text-red-700">
													{error}
												</p>
											)
										: null
									}

									<button
										className="
											self-start
											rounded-full
											bg-sky
											px-4
											py-2.5
											text-sm
											font-semibold
											text-white
											hover:bg-sky/90
											disabled:opacity-60
										"
										type="submit"
										disabled={submitting}
									>
										{submitting
											? 'Creating…'
											: 'Create vendor'
										}
									</button>
								</form>
							</div>
						</section>
					)
				: null
			}
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
