'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	compoundQtyProfile,
	compoundToDecimal,
	decimalToCompound,
	formatQty,
	type QtyCompound,
} from '../../lib/uom-qty';

type CompoundQtyFieldProps = {
	uomCode?: string;
	label: string;
	value: string;
	onChange: (decimal: string) => void;
	onCommit?: (decimal: string) => void;
	required?: boolean;
	disabled?: boolean;
	placeholder?: string;
};

export function CompoundQtyField({
	uomCode,
	label,
	value,
	onChange,
	onCommit,
	required,
	disabled,
	placeholder,
}: CompoundQtyFieldProps) {
	const profile = compoundQtyProfile(uomCode);
	const [compoundMode, setCompoundMode] = useState(false);
	const [parts, setParts] = useState<QtyCompound>(() =>
		decimalToCompound(uomCode ?? '', value || '0'),
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setParts(decimalToCompound(uomCode ?? '', value || '0'));
	}, [uomCode]);

	const preview = useMemo(() => {
		if(!profile || !compoundMode) {
			return null;
		}
		try {
			return formatQty(compoundToDecimal(uomCode ?? '', parts), uomCode);
		}
		catch {
			return null;
		}
	}, [compoundMode, parts, profile, uomCode]);

	const emitFromParts = (next: QtyCompound) => {
		setParts(next);
		try {
			const decimal = compoundToDecimal(uomCode ?? '', next);
			setError(null);
			onChange(decimal);
		}
		catch(parseError) {
			setError(parseError instanceof Error ? parseError.message : 'Invalid quantity.');
		}
	};

	const inputClassName = `
		mt-1
		w-full
		rounded-lg
		border
		border-slate-300
		px-3
		py-2
	`;

	return (
		<div className="block text-sm">
			<div
				className="
					flex
					flex-wrap
					items-center
					justify-between
					gap-2
				"
			>
				<span className="font-semibold">
					{label}
				</span>
				{profile
					? (
							<label
								className="
									flex
									items-center
									gap-1.5
									text-xs
									font-medium
									text-slate-600
								"
							>
								<input
									type="checkbox"
									checked={compoundMode}
									disabled={disabled}
									onChange={(event) => {
										setCompoundMode(event.target.checked);
										setError(null);
										if(event.target.checked) {
											setParts(decimalToCompound(uomCode ?? '', value || '0'));
										}
									}}
								/>
								Enter as {profile.majorLabel.toLowerCase()}
								{profile.minorLabel
									? ` and ${profile.minorLabel.toLowerCase()}`
									: ''
								}
							</label>
						)
					: null
				}
			</div>

			{compoundMode && profile
				? (
						<div
							className="
								mt-1
								grid
								gap-2
								sm:grid-cols-3
							"
						>
							<label>
								<span className="text-xs text-slate-500">
									{profile.majorLabel}
								</span>
								<input
									className={inputClassName}
									value={parts.major ?? ''}
									disabled={disabled}
									required={required}
									onChange={(event) =>
										emitFromParts({ ...parts, major: event.target.value })
									}
									onBlur={() => onCommit?.(value)}
								/>
							</label>
							{profile.minorLabel
								? (
										<label>
											<span className="text-xs text-slate-500">
												{profile.minorLabel}
											</span>
											<input
												className={inputClassName}
												value={parts.minor ?? ''}
												disabled={disabled}
												onChange={(event) =>
													emitFromParts({ ...parts, minor: event.target.value })
												}
												onBlur={() => onCommit?.(value)}
											/>
										</label>
									)
								: null
							}
							{profile.fractionDenominator
								? (
										<label>
											<span className="text-xs text-slate-500">
												{profile.fractionLabel}
											</span>
											<input
												className={inputClassName}
												value={parts.fraction ?? ''}
												disabled={disabled}
												min={0}
												max={profile.fractionDenominator - 1}
												onChange={(event) =>
													emitFromParts({ ...parts, fraction: event.target.value })
												}
												onBlur={() => onCommit?.(value)}
											/>
										</label>
									)
								: null
							}
						</div>
					)
				: (
						<input
							className={inputClassName}
							value={value}
							disabled={disabled}
							required={required}
							placeholder={placeholder}
							onChange={(event) => {
								setError(null);
								onChange(event.target.value);
							}}
							onBlur={() => onCommit?.(value)}
						/>
					)
			}

			{compoundMode && profile
				? (
						<p className="mt-1 text-xs text-slate-500">
							Price stays per {profile.majorSingular}.
							Stored as {preview ?? formatQty(value || '0', uomCode)}.
						</p>
					)
				: null
			}
			{error
				? (
						<p className="mt-1 text-xs text-red-700">
							{error}
						</p>
					)
				: null
			}
		</div>
	);
}
