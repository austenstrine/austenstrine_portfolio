'use client';

import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import {
	listCatalogCategories,
	requestCatalogCategory,
} from '../../../lib/catalog-api';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { CatalogCover } from '../../../components/catalog/CatalogCover';
import { sortCategoryTree } from '../../../lib/category-tree';

type CategoryRow = {
	id: string;
	slug: string;
	name: string;
	imageUrl?: string | null;
	parent?: { id: string; name: string; slug: string } | null;
	_count?: { products: number; children: number };
};

const fieldClassName = `
	mt-1
	w-full
	rounded-lg
	border
	border-slate-300
	px-3
	py-2
	text-sm
`;

function CategoryManageContent() {
	const [categories, setCategories] = useState<CategoryRow[]>([]);
	const [loading, setLoading] = useState(true);

	const [requestName, setRequestName] = useState('');
	const [requestParent, setRequestParent] = useState('');
	const [requestNote, setRequestNote] = useState('');
	const [requestError, setRequestError] = useState<string | null>(null);
	const [requestMessage, setRequestMessage] = useState<string | null>(null);
	const [requestBusy, setRequestBusy] = useState(false);
	const categoryTree = sortCategoryTree(categories);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			setCategories(await listCatalogCategories());
		}
		catch {
			setCategories([]);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const onRequest = async (event: FormEvent) => {
		event.preventDefault();
		setRequestError(null);
		setRequestMessage(null);
		setRequestBusy(true);
		try {
			const result = await requestCatalogCategory({
				name: requestName.trim(),
				suggestedParent: requestParent.trim() || undefined,
				note: requestNote.trim() || undefined,
			});
			setRequestMessage(result.message);
			setRequestName('');
			setRequestParent('');
			setRequestNote('');
		}
		catch(submitError) {
			setRequestError(
				submitError instanceof Error
					? submitError.message
					: 'Could not send category request.',
			);
		}
		finally {
			setRequestBusy(false);
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
			<div
				className="
					flex
					flex-wrap
					items-center
					justify-between
					gap-3
				"
			>
				<h1
					className="
						text-2xl
						font-semibold
						tracking-tight
						text-ink
					"
				>
					Categories
				</h1>
				{!loading && categories.length > 0
					? (
							<p className="text-sm text-slate-500">
								{categories.length === 1
									? '1 category'
									: `${categories.length} categories`
								}
							</p>
						)
					: null
				}
			</div>

			<section>
				<form
					className="
						flex
						flex-col
						gap-4
					"
					onSubmit={onRequest}
				>
					<label className="block text-sm">
						<span className="font-semibold">
							Category name
						</span>
						<input
							className={fieldClassName}
							value={requestName}
							onChange={(event) => setRequestName(event.target.value)}
							required
							minLength={2}
							maxLength={120}
							placeholder="Conduit & Raceway"
						/>
					</label>
					<label className="block text-sm">
						<span className="font-semibold">
							Suggested parent
						</span>
						<input
							className={fieldClassName}
							value={requestParent}
							onChange={(event) => setRequestParent(event.target.value)}
							maxLength={120}
							placeholder="Optional"
						/>
					</label>
					<label className="block text-sm">
						<span className="font-semibold">
							Note
						</span>
						<textarea
							className={fieldClassName}
							value={requestNote}
							onChange={(event) => setRequestNote(event.target.value)}
							rows={3}
							maxLength={2000}
							placeholder="Optional"
						/>
					</label>
					{requestError
						? (
								<p className="text-sm text-red-700">
									{requestError}
								</p>
							)
						: null
					}
					{requestMessage
						? (
								<p className="text-sm text-emerald-700">
									{requestMessage}
								</p>
							)
						: null
					}
					<div className="flex justify-end">
						<button
							className="
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
							disabled={requestBusy}
						>
							{requestBusy
								? 'Sending…'
								: 'Send request'
							}
						</button>
					</div>
				</form>
			</section>

			<section
				className="
					flex
					flex-col
					gap-2
				"
			>
				{loading
					? (
							<p className="text-sm text-slate-500">
								Loading…
							</p>
						)
					: null
				}
				{!loading && categories.length === 0
					? (
							<p className="text-sm text-slate-500">
								No categories yet.
							</p>
						)
					: null
				}
				{categoryTree.length > 0
					? (
							<ul
								className="
									divide-y
									divide-slate-200
									border-y
									border-slate-200
								"
							>
								{categoryTree.map((category) => (
									<li
										className="
											flex
											items-center
											gap-3
											px-1
											py-3
										"
										key={category.id}
										style={{ paddingLeft: `${category.depth * 16 + 4}px` }}
									>
										<div
											className="
												h-10
												w-14
												shrink-0
												overflow-hidden
												rounded
												bg-slate-100
											"
										>
											<CatalogCover
												src={category.imageUrl}
												alt=""
												className="h-full w-full object-cover"
												width={112}
												height={80}
												fallback={
													<span className="block h-full w-full bg-slate-100" />
												}
											/>
										</div>
										<div className="min-w-0 flex-1">
											<p className="font-semibold text-ink">
												{category.name}
											</p>
											<p className="text-sm text-slate-500">
												{category._count?.products ?? 0}
												{' products'}
												{(category._count?.children ?? 0) > 0
													? ` · ${category._count?.children} children`
													: null
												}
											</p>
										</div>
									</li>
								))}
							</ul>
						)
					: null
				}
			</section>
		</div>
	);
}

export default function CategoryManagePage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess
				vendorRequired
				reasonKey="categories"
			>
				<CategoryManageContent />
			</RequireAccess>
		</Suspense>
	);
}
