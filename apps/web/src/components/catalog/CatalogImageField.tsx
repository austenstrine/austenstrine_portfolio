'use client';

import { useRef, useState } from 'react';
import { uploadCatalogMedia } from '../../lib/catalog-api';
import { CdnImg } from '../CdnImg';

type CatalogImageFieldProps = {
	value: string[];
	onChange: (next: string[]) => void;
	kind: 'product' | 'category';
	vendorId?: string;
	productId?: string;
	categoryId?: string;
	max?: number;
	disabled?: boolean;
	disabledReason?: string;
};

export function CatalogImageField({
	value,
	onChange,
	kind,
	vendorId,
	productId,
	categoryId,
	max = kind === 'category' ? 1 : 8,
	disabled = false,
	disabledReason,
}: CatalogImageFieldProps) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canAdd = !disabled && value.length < max;

	const onPick = async (fileList: FileList | null) => {
		const file = fileList?.[0];
		if(!file) {
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const stored = await uploadCatalogMedia({
				file,
				kind,
				vendorId,
				productId,
				categoryId,
			});
			if(max === 1) {
				onChange([stored.path]);
			}
			else {
				onChange([...value, stored.path].slice(0, max));
			}
		}
		catch(uploadError) {
			setError(uploadError instanceof Error ? uploadError.message : 'Could not upload image.');
		}
		finally {
			setBusy(false);
			if(inputRef.current) {
				inputRef.current.value = '';
			}
		}
	};

	const move = (index: number, direction: -1 | 1) => {
		const nextIndex = index + direction;
		if(nextIndex < 0 || nextIndex >= value.length) {
			return;
		}
		const next = [...value];
		const [item] = next.splice(index, 1);
		next.splice(nextIndex, 0, item);
		onChange(next);
	};

	return (
		<div className="flex flex-col gap-3">
			<div>
				<p className="text-sm font-semibold">
					{kind === 'category' ? 'Category image' : 'Product images'}
				</p>
				<p className="mt-1 text-xs text-slate-500">
					JPEG, PNG, WebP, GIF, or AVIF up to 8 MB.
					{kind === 'product' ? ` Up to ${max} photos.` : ''}
				</p>
			</div>

			{value.length > 0
				? (
					<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{value.map((src, index) => (
							<li key={`${src}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
								<CdnImg
									src={src}
									alt=""
									className="aspect-[5/3] w-full object-cover"
									cdn={{ w: 480, h: 288, fit: 'cover', q: 70 }}
								/>
								<div className="flex items-center justify-between gap-1 px-2 py-1.5">
									{max > 1
										? (
											<div className="flex gap-1">
												<button
													type="button"
													className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white"
													onClick={() => move(index, -1)}
													disabled={index === 0}
												>
													Up
												</button>
												<button
													type="button"
													className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-white"
													onClick={() => move(index, 1)}
													disabled={index === value.length - 1}
												>
													Down
												</button>
											</div>
										)
										: <span className="text-[11px] text-slate-500">Cover</span>}
									<button
										type="button"
										className="rounded-md px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-white"
										onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
									>
										Remove
									</button>
								</div>
							</li>
						))}
					</ul>
				)
				: (
					<div className="flex aspect-[5/2] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
						No image yet
					</div>
				)}

			<input
				ref={inputRef}
				type="file"
				accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
				className="hidden"
				onChange={(event) => void onPick(event.target.files)}
			/>

			{error
				? <p className="text-sm text-red-700">{error}</p>
				: null}

			{disabled && disabledReason
				? <p className="text-xs text-slate-500">{disabledReason}</p>
				: null}

			<button
				type="button"
				disabled={!canAdd || busy}
				onClick={() => inputRef.current?.click()}
				className="self-start rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-sky disabled:opacity-50"
			>
				{busy ? 'Uploading…' : value.length ? 'Add image' : 'Upload image'}
			</button>
		</div>
	);
}
