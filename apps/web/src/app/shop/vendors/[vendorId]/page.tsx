'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
	createVendorAppPassword,
	getMyVendor,
	listVendorAppPasswords,
	revokeVendorAppPassword,
	type CreatedVendorAppPassword,
	type VendorAppPassword,
	type VendorDetail,
} from '../../../../lib/catalog-api';
import { useSession } from '../../../../lib/useSession';

export default function VendorDetailPage() {
	const params = useParams<{ vendorId: string }>();
	const vendorId = params.vendorId;
	const { user, loading: sessionLoading } = useSession();
	const [vendor, setVendor] = useState<VendorDetail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [passwords, setPasswords] = useState<VendorAppPassword[]>([]);
	const [passwordName, setPasswordName] = useState('Inventory sync');
	const [createdToken, setCreatedToken] = useState<CreatedVendorAppPassword | null>(null);
	const [passwordBusy, setPasswordBusy] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);

	useEffect(() => {
		if(!user || !vendorId) {
			setLoading(false);
			return;
		}

		setLoading(true);
		getMyVendor(vendorId)
			.then(async (detail) => {
				setVendor(detail);
				if(detail.myRole === 'OWNER') {
					try {
						setPasswords(await listVendorAppPasswords(vendorId));
					}
					catch {
						setPasswords([]);
					}
				}
			})
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

	async function onCreatePassword() {
		if(!vendorId) {
			return;
		}
		setPasswordBusy(true);
		setPasswordError(null);
		try {
			const created = await createVendorAppPassword(vendorId, passwordName);
			setCreatedToken(created);
			setPasswords(await listVendorAppPasswords(vendorId));
		}
		catch (createError) {
			setPasswordError(
				createError instanceof Error
					? createError.message
					: 'Could not create app password.',
			);
		}
		finally {
			setPasswordBusy(false);
		}
	}

	async function onRevokePassword(passwordId: string) {
		if(!vendorId) {
			return;
		}
		setPasswordBusy(true);
		setPasswordError(null);
		try {
			await revokeVendorAppPassword(vendorId, passwordId);
			setPasswords(await listVendorAppPasswords(vendorId));
		}
		catch (revokeError) {
			setPasswordError(
				revokeError instanceof Error
					? revokeError.message
					: 'Could not revoke app password.',
			);
		}
		finally {
			setPasswordBusy(false);
		}
	}

	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
			<a
				className="
					text-sm
					font-semibold
					text-sky
					hover:underline
				"
				href="/shop/vendors"
			>
				← Back to vendors
			</a>

			{sessionLoading || loading
				? (
					<p className="text-sm text-slate-500">
						Loading…
					</p>
				)
				: null}

			{!sessionLoading && !user
				? (
					<p className="text-sm text-amber-800">
						Sign in to view this vendor organization.{' '}
						<a
							className="
								font-semibold
								text-sky
								hover:underline
							"
							href="/auth/login"
						>
							Sign in
						</a>
					</p>
				)
				: null}

			{error
				? (
					<p className="text-sm text-red-700">
						{error}
					</p>
				)
				: null}

			{vendor
				? (
					<>
						<div>
							<p
								className="
									text-xs
									font-semibold
									uppercase
									tracking-wide
									text-slate-500
								"
							>
								{vendor.myRole}
							</p>
							<h1
								className="
									mt-1
									text-3xl
									font-semibold
									tracking-tight
								"
							>
								{vendor.name}
							</h1>
							<p className="mt-1 text-slate-600">
								/shop/{vendor.slug}
							</p>
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
								Members
							</h2>
							<ul
								className="
									mt-4
									flex
									flex-col
									gap-3
								"
							>
								{vendor.members.map((member) => (
									<li
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
										key={member.userId}
									>
										<div>
											<p className="font-semibold">
												{member.email}
											</p>
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
							<h2 className="text-lg font-semibold">
								Catalog
							</h2>
							<p
								className="
									mt-2
									text-sm
									text-slate-600
								"
							>
								{vendor.productCount} product
								{vendor.productCount === 1 ? '' : 's'} in this organization.
							</p>
							<div
								className="
									mt-3
									flex
									flex-wrap
									gap-4
								"
							>
								<a
									className="
										text-sm
										font-semibold
										text-sky
										hover:underline
									"
									href={`/shop/search?vendor=${encodeURIComponent(vendor.slug)}`}
								>
									View products
								</a>
								<a
									className="
										text-sm
										font-semibold
										text-sky
										hover:underline
									"
									href={`/shop/vendors/${vendor.id}/import`}
								>
									Bulk CSV import
								</a>
							</div>
						</section>

						{vendor.myRole === 'OWNER'
							? (
								<section
									id="app-passwords"
									className="
										rounded-2xl
										border
										border-slate-200
										bg-white
										p-5
									"
								>
									<h2 className="text-lg font-semibold">
										App passwords
									</h2>
									<p
										className="
											mt-2
											text-sm
											text-slate-600
										"
									>
										Create a vendor-scoped token for your developers or servers.
										They can validate and commit CSV imports against the API
										without signing in as a person. Copy the token once when it is
										created, then hand it off securely.
									</p>

									{passwordError
										? (
											<p
												className="
													mt-3
													text-sm
													text-red-700
												"
											>
												{passwordError}
											</p>
										)
										: null}

									{createdToken
										? (
											<div
												className="
													mt-4
													rounded-xl
													border
													border-amber-200
													bg-amber-50
													p-4
												"
											>
												<p className="text-sm font-semibold text-amber-900">
													{createdToken.warning}
												</p>
												<code
													className="
														mt-2
														block
														break-all
														rounded-lg
														bg-white
														px-3
														py-2
														font-mono
														text-xs
														text-ink
													"
												>
													{createdToken.token}
												</code>
												<button
													type="button"
													className="
														mt-3
														text-sm
														font-semibold
														text-sky
														hover:underline
													"
													onClick={() =>
														void navigator.clipboard.writeText(
															createdToken.token,
														)
													}
												>
													Copy token
												</button>
											</div>
										)
										: null}

									<div
										className="
											mt-4
											flex
											flex-wrap
											items-end
											gap-3
										"
									>
										<label className="text-sm">
											<span className="font-semibold">
												Name
											</span>
											<input
												className="
													mt-1
													block
													rounded-lg
													border
													border-slate-300
													px-3
													py-2
												"
												value={passwordName}
												onChange={(event) =>
													setPasswordName(event.target.value)
												}
											/>
										</label>
										<button
											type="button"
											disabled={passwordBusy || !passwordName.trim()}
											className="
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
											onClick={() => void onCreatePassword()}
										>
											Create app password
										</button>
									</div>

									<ul
										className="
											mt-4
											flex
											flex-col
											gap-3
										"
									>
										{passwords.length === 0
											? (
												<li className="text-sm text-slate-500">
													No app passwords yet.
												</li>
											)
											: null}
										{passwords.map((row) => (
											<li
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
												key={row.id}
											>
												<div>
													<p className="font-semibold">
														{row.name}
													</p>
													<p className="text-xs text-slate-500">
														{row.hint}
														{row.active ? '' : ' · revoked'}
														{row.lastUsedAt
															? ` · last used ${new Date(row.lastUsedAt).toLocaleString()}`
															: ''}
													</p>
												</div>
												{row.active
													? (
														<button
															type="button"
															disabled={passwordBusy}
															className="
																text-sm
																font-semibold
																text-red-700
																hover:underline
																disabled:opacity-60
															"
															onClick={() =>
																void onRevokePassword(row.id)
															}
														>
															Revoke
														</button>
													)
													: null}
											</li>
										))}
									</ul>

									<pre
										className="
											mt-4
											overflow-x-auto
											rounded-xl
											bg-slate-950
											p-4
											font-mono
											text-xs
											text-slate-100
										"
									>
{`curl -X POST \\
  "$API/catalog/vendors/${vendor.id}/imports/validate" \\
  -H "Authorization: Bearer vas_…" \\
  -H "Content-Type: application/json" \\
  -d '{"csv":"…","source":"API"}'`}
									</pre>
								</section>
							)
							: null}
					</>
				)
				: null}
		</div>
	);
}
