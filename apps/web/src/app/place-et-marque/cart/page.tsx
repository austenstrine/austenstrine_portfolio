'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import {
	formatMoney,
	getCart,
	removeCartLine,
	upsertCartLine,
	type CartDto,
} from '../../../lib/checkout-api';
import { useSession } from '../../../lib/useSession';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { CompoundQtyField } from '../../../components/catalog/CompoundQtyField';
import { formatQty } from '../../../lib/uom-qty';

function CartContent() {
	const { user, loading: sessionLoading } = useSession();
	const [cart, setCart] = useState<CartDto | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	async function refresh() {
		const next = await getCart();
		setCart(next);
	}

	useEffect(() => {
		if(!user) {
			return;
		}
		refresh().catch((loadError) => {
			setError(
				loadError instanceof Error ? loadError.message : 'Could not load cart.',
			);
		});
	}, [user]);

	async function onQty(offeringId: string, quantity: string) {
		setBusy(true);
		setError(null);
		try {
			setCart(await upsertCartLine(offeringId, quantity));
		}
		catch(updateError) {
			setError(
				updateError instanceof Error
					? updateError.message
					: 'Could not update cart.',
			);
		}
		finally {
			setBusy(false);
		}
	}

	async function onRemove(offeringId: string) {
		setBusy(true);
		setError(null);
		try {
			setCart(await removeCartLine(offeringId));
		}
		catch(removeError) {
			setError(
				removeError instanceof Error
					? removeError.message
					: 'Could not remove line.',
			);
		}
		finally {
			setBusy(false);
		}
	}

	const merchandiseCents =
		cart?.lines.reduce((sum, line) => sum + line.lineTotalCents, 0) ?? 0;
	const vendorGroups: Array<{
		name: string;
		slug: string;
		lines: CartDto['lines'];
	}> = [];
	if(cart) {
		const byVendor = new Map<string, { name: string; slug: string; lines: CartDto['lines'] }>();
		for(const line of cart.lines) {
			const existing = byVendor.get(line.vendor.id);
			if(existing) {
				existing.lines.push(line);
			}
			else {
				byVendor.set(line.vendor.id, {
					name: line.vendor.name,
					slug: line.vendor.slug,
					lines: [line],
				});
			}
		}
		vendorGroups.push(...byVendor.values());
	}

	return (
		<div
			className="
				flex
				flex-col
				gap-6
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
					Cart
				</h1>
				<p
					className="
						mt-2
						text-sm
						text-slate-600
					"
				>
					Items from different sellers checkout as separate shipments when needed.
				</p>
			</div>

			{sessionLoading
				? (
					<p className="text-sm text-slate-500">
						Checking session…
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

			{user && cart && cart.lines.length === 0
				? (
					<div
						className="
							rounded-2xl
							border
							border-dashed
							border-slate-300
							bg-white
							px-6
							py-16
							text-center
						"
					>
						<p className="text-xl font-semibold text-ink">
							Your cart is empty
						</p>
						<p
							className="
								mx-auto
								mt-2
								max-w-md
								text-sm
								text-slate-600
							"
						>
							Browse the store and add a listing to get started.
						</p>
						<Link
							className="
								mt-6
								inline-flex
								rounded-full
								bg-ink
								px-5
								py-2.5
								text-sm
								font-semibold
								text-white
								hover:bg-sky
							"
							href="/place-et-marque/search"
						>
							Shop products
						</Link>
					</div>
				)
				: null
			}

			{user && cart && cart.lines.length > 0
				? (
					<div
						className="
							grid
							gap-6
							lg:grid-cols-[minmax(0,1fr)_20rem]
							lg:items-start
						"
					>
						<ul
							className="
								flex
								flex-col
								gap-6
							"
						>
							{vendorGroups.map((group) => (
								<li
									className="
										overflow-hidden
										rounded-2xl
										border
										border-slate-200
										bg-white
									"
									key={group.slug}
								>
									<div
										className="
											border-b
											border-slate-100
											px-4
											py-3
										"
									>
										<p
											className="
												text-[11px]
												font-semibold
												uppercase
												tracking-[0.16em]
												text-slate-500
											"
										>
											Sold by
										</p>
										<Link
											className="
												mt-0.5
												text-sm
												font-semibold
												text-ink
												hover:underline
											"
											href={`/place-et-marque/search?vendor=${encodeURIComponent(group.slug)}`}
										>
											{group.name}
										</Link>
									</div>
									<ul
										className="
											flex
											flex-col
											divide-y
											divide-slate-100
										"
									>
										{group.lines.map((line) => (
											<li
												className="p-4"
												key={line.id}
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
													<div className="min-w-0 flex-1">
														<Link
															className="
																font-semibold
																text-ink
																hover:underline
															"
															href={`/place-et-marque/${line.vendor.slug}/${line.productSlug}`}
														>
															{line.title}
														</Link>
														<p
															className="
																mt-1
																text-sm
																text-slate-600
															"
														>
															{line.sku} · {line.uom}
														</p>
														<p
															className="
																text-sm
																text-slate-500
															"
														>
															{formatMoney(line.unitPriceCents, line.currency)} each
															{' · '}
															{formatQty(line.availableQty, line.uom)} available
														</p>
													</div>
													<p
														className="
															font-semibold
															tabular-nums
														"
													>
														{formatMoney(line.lineTotalCents, line.currency)}
													</p>
												</div>
												<div
													className="
														mt-3
														flex
														flex-wrap
														items-center
														gap-3
													"
												>
													<div className="min-w-[16rem] flex-1">
														<CompoundQtyField
															label="Qty"
															uomCode={line.uom}
															value={line.quantity}
															disabled={busy}
															onChange={(quantity) => {
																setCart((current) =>
																	current
																		? {
																				...current,
																				lines: current.lines.map((row) =>
																					row.offeringId === line.offeringId
																						? { ...row, quantity }
																						: row
																				),
																			}
																		: current
																);
															}}
															onCommit={(quantity) =>
																void onQty(line.offeringId, quantity)
															}
														/>
													</div>
													<button
														className="
															text-sm
															font-semibold
															text-red-700
															hover:underline
															disabled:opacity-60
														"
														type="button"
														disabled={busy}
														onClick={() => void onRemove(line.offeringId)}
													>
														Remove
													</button>
												</div>
											</li>
										))}
									</ul>
								</li>
							))}
						</ul>
						<aside
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
								lg:sticky
								lg:top-24
							"
						>
							<h2
								className="
									text-lg
									font-semibold
								"
							>
								Order summary
							</h2>
							<dl
								className="
									mt-4
									flex
									flex-col
									gap-2
									text-sm
								"
							>
								<div
									className="
										flex
										justify-between
										gap-3
									"
								>
									<dt className="text-slate-600">
										Items ({cart.lineCount})
									</dt>
									<dd className="tabular-nums">
										{formatMoney(merchandiseCents)}
									</dd>
								</div>
								<div
									className="
										flex
										justify-between
										gap-3
										border-t
										border-slate-100
										pt-3
										text-base
										font-semibold
									"
								>
									<dt>
										Merchandise
									</dt>
									<dd className="tabular-nums">
										{formatMoney(merchandiseCents)}
									</dd>
								</div>
							</dl>
							<p
								className="
									mt-3
									text-[12px]
									leading-5
									text-slate-500
								"
							>
								Shipping is chosen per seller at checkout.
							</p>
							<Link
								className="
									mt-5
									flex
									w-full
									items-center
									justify-center
									rounded-full
									bg-ink
									px-4
									py-3
									text-sm
									font-semibold
									text-white
									hover:bg-sky
								"
								href="/place-et-marque/checkout"
							>
								Checkout
							</Link>
							<Link
								className="
									mt-3
									flex
									justify-center
									text-sm
									font-semibold
									text-ink
									hover:underline
								"
								href="/place-et-marque/search"
							>
								Continue shopping
							</Link>
						</aside>
					</div>
				)
				: null
			}
		</div>
	);
}

export default function CartPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess reasonKey="cart">
				<CartContent />
			</RequireAccess>
		</Suspense>
	);
}
