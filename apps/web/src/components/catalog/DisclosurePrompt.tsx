'use client';

type DisclosurePromptProps = {
	/** The question that stands in for a hidden section. */
	question: string;
	onExpand: () => void;
	/** Optional secondary action (e.g. collapse after expand). */
	expanded?: boolean;
	onCollapse?: () => void;
	collapseLabel?: string;
};

/**
 * In-place progressive disclosure: a question-shaped control that sits where
 * the more complex UI would appear, and expands it when answered “yes.”
 */
export function DisclosurePrompt({
	question,
	onExpand,
	expanded = false,
	onCollapse,
	collapseLabel = 'Keep it simple',
}: DisclosurePromptProps) {
	if(expanded && onCollapse) {
		return (
			<button
				type="button"
				className="
					text-left
					text-xs
					font-medium
					text-slate-500
					underline-offset-2
					hover:text-sky
					hover:underline
				"
				onClick={onCollapse}
			>
				{collapseLabel}
			</button>
		);
	}

	if(expanded) {
		return null;
	}

	return (
		<button
			type="button"
			className="
				w-full
				rounded-2xl
				border
				border-dashed
				border-slate-300
				bg-frost/60
				px-4
				py-3
				text-left
				text-sm
				font-medium
				text-slate-700
				transition
				hover:border-sky
				hover:text-sky
			"
			onClick={onExpand}
		>
			{question}
		</button>
	);
}
