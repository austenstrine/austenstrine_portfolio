'use client';

import type { ProductMeasuresPayload } from '../../lib/catalog-api';

type ProductMeasuresFieldProps = {
	value: ProductMeasuresPayload;
	onChange: (next: ProductMeasuresPayload) => void;
};

function Field({
	label,
	fieldValue,
	onChange,
	placeholder,
}: {
	label: string;
	fieldValue: string;
	onChange: (next: string) => void;
	placeholder?: string;
}) {
	return (
		<label className="block text-sm">
			<span className="font-semibold">
				{label}
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
				value={fieldValue}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
			/>
		</label>
	);
}

export function emptyProductMeasures(): ProductMeasuresPayload {
	return {
		lengthNumeric: '',
		widthNumeric: '',
		heightNumeric: '',
		linearUnit: 'in',
		weightNumeric: '',
		weightUnit: 'lb',
		packageLengthNumeric: '',
		packageWidthNumeric: '',
		packageHeightNumeric: '',
		packageLinearUnit: 'in',
		packageWeightNumeric: '',
		packageWeightUnit: 'lb',
		volumeNumeric: '',
		volumeUnit: '',
		netContentNumeric: '',
		netContentUnit: '',
		piecesPerRetailUnit: null,
		voltageNumeric: '',
		wattageNumeric: '',
		amperageNumeric: '',
		frequencyHzNumeric: '',
		capacityNumeric: '',
		capacityUnit: '',
		gtin: '',
		mpn: '',
		countryOfOrigin: '',
		condition: 'NA',
		releaseAt: '',
		expiresAt: '',
	};
}

export function ProductMeasuresField({
	value,
	onChange,
}: ProductMeasuresFieldProps) {
	const patch = (partial: Partial<ProductMeasuresPayload>) => {
		onChange({ ...value, ...partial });
	};

	return (
		<div className="space-y-4">
			<p className="text-xs text-slate-500">
				Measurements used for shipping, filtering, and search. Leave blank if they do not apply.
			</p>
			<div className="grid gap-3 md:grid-cols-4">
				<Field
					label="Length"
					fieldValue={value.lengthNumeric ?? ''}
					onChange={(next) => patch({ lengthNumeric: next })}
				/>
				<Field
					label="Width"
					fieldValue={value.widthNumeric ?? ''}
					onChange={(next) => patch({ widthNumeric: next })}
				/>
				<Field
					label="Height"
					fieldValue={value.heightNumeric ?? ''}
					onChange={(next) => patch({ heightNumeric: next })}
				/>
				<Field
					label="Linear unit"
					fieldValue={value.linearUnit ?? ''}
					onChange={(next) => patch({ linearUnit: next })}
					placeholder="in or cm"
				/>
				<Field
					label="Weight"
					fieldValue={value.weightNumeric ?? ''}
					onChange={(next) => patch({ weightNumeric: next })}
				/>
				<Field
					label="Weight unit"
					fieldValue={value.weightUnit ?? ''}
					onChange={(next) => patch({ weightUnit: next })}
					placeholder="lb, oz, kg, g"
				/>
			</div>
			<div className="grid gap-3 md:grid-cols-4">
				<Field
					label="Package L"
					fieldValue={value.packageLengthNumeric ?? ''}
					onChange={(next) => patch({ packageLengthNumeric: next })}
				/>
				<Field
					label="Package W"
					fieldValue={value.packageWidthNumeric ?? ''}
					onChange={(next) => patch({ packageWidthNumeric: next })}
				/>
				<Field
					label="Package H"
					fieldValue={value.packageHeightNumeric ?? ''}
					onChange={(next) => patch({ packageHeightNumeric: next })}
				/>
				<Field
					label="Package weight"
					fieldValue={value.packageWeightNumeric ?? ''}
					onChange={(next) => patch({ packageWeightNumeric: next })}
				/>
			</div>
			<div className="grid gap-3 md:grid-cols-3">
				<Field
					label="Voltage"
					fieldValue={value.voltageNumeric ?? ''}
					onChange={(next) => patch({ voltageNumeric: next })}
				/>
				<Field
					label="Wattage"
					fieldValue={value.wattageNumeric ?? ''}
					onChange={(next) => patch({ wattageNumeric: next })}
				/>
				<Field
					label="Amperage"
					fieldValue={value.amperageNumeric ?? ''}
					onChange={(next) => patch({ amperageNumeric: next })}
				/>
				<Field
					label="GTIN"
					fieldValue={value.gtin ?? ''}
					onChange={(next) => patch({ gtin: next })}
				/>
				<Field
					label="MPN"
					fieldValue={value.mpn ?? ''}
					onChange={(next) => patch({ mpn: next })}
				/>
				<label className="block text-sm">
					<span className="font-semibold">
						Condition
					</span>
					<select
						className="
							mt-1
							w-full
							rounded-lg
							border
							border-slate-300
							px-3
							py-2
						"
						value={value.condition ?? 'NA'}
						onChange={(event) =>
							patch({
								condition: event.target.value as ProductMeasuresPayload['condition'],
							})
						}
					>
						<option value="NA">
							Not specified
						</option>
						<option value="NEW">
							New
						</option>
						<option value="USED">
							Used
						</option>
						<option value="REFURBISHED">
							Refurbished
						</option>
					</select>
				</label>
			</div>
		</div>
	);
}
