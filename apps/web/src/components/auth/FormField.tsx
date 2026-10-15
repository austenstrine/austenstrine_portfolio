type FormFieldProps = {
	label: string;
	type?: string;
	value: string;
	onChange: (value: string) => void;
	autoComplete?: string;
	placeholder?: string;
	required?: boolean;
	maxLength?: number;
	inputMode?: 'text' | 'numeric' | 'email';
};

export function FormField({
	label,
	type = 'text',
	value,
	onChange,
	autoComplete,
	placeholder,
	required = true,
	maxLength,
	inputMode,
}: FormFieldProps) {
	return (
		<label className="block">
			<span
				className="
					text-xs
					font-semibold
					uppercase
					tracking-[0.1em]
					text-slate-500
				"
			>
				{label}
			</span>
			<input
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				autoComplete={autoComplete}
				placeholder={placeholder}
				required={required}
				maxLength={maxLength}
				inputMode={inputMode}
				className="
					mt-2
					w-full
					rounded-lg
					border
					border-slate-300
					px-3
					py-2
					text-sm
					text-ink
					transition
					focus:border-sky
					focus:outline-none
					focus:ring-2
					focus:ring-sky/30
				"
			/>
		</label>
	);
}
