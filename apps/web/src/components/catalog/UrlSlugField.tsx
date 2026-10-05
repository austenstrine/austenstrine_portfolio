type UrlSlugFieldProps = {
	label: string;
	value: string;
	onChange: (value: string) => void;
	prefixPath: string;
	placeholder?: string;
	helpText?: string;
	required?: boolean;
	maxLength?: number;
};

function siteOrigin(): string {
	if(typeof window !== 'undefined' && window.location?.origin) {
		return window.location.origin;
	}
	return 'https://local.austenstrine.dev';
}

export function UrlSlugField({
	label,
	value,
	onChange,
	prefixPath,
	placeholder = 'your-store',
	helpText,
	required = true,
	maxLength = 80,
}: UrlSlugFieldProps) {
	const origin = siteOrigin();
	const prefix = `${origin}${prefixPath.endsWith('/') ? prefixPath : `${prefixPath}/`}`;

	return (
		<label className="block text-sm">
			<span className="font-semibold">{label}</span>
			<div
				className="
					mt-1
					flex
					overflow-hidden
					rounded-lg
					border
					border-slate-300
					focus-within:border-sky
					focus-within:ring-2
					focus-within:ring-sky/30
				"
			>
				<span
					className="
						hidden
						max-w-[55%]
						shrink-0
						truncate
						bg-slate-50
						px-3
						py-2
						text-slate-500
						sm:inline
					"
					title={prefix}
				>
					{prefix}
				</span>
				<input
					value={value}
					onChange={(event) => onChange(event.target.value)}
					required={required}
					minLength={2}
					maxLength={maxLength}
					pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
					placeholder={placeholder}
					aria-label={label}
					className="
						min-w-0
						flex-1
						border-0
						px-3
						py-2
						text-ink
						outline-none
					"
				/>
			</div>
			<span className="mt-1 block text-xs text-slate-500 sm:hidden">
				Full URL: {prefix}
				{value || placeholder}
			</span>
			{helpText ? <span className="mt-1 block text-xs text-slate-500">{helpText}</span> : null}
		</label>
	);
}
