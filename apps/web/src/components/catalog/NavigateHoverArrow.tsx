import { ArrowRightIcon } from '../icons/ArrowRightIcon';

/**
 * Shafted navigate cue for whole-card / pill rows.
 * Below `lg` (tablet and smaller): always visible — touch has no hover.
 * At `lg+` (desktop): hidden at rest; animates in under `(hover: hover)` +
 * group-hover, or group-focus-visible for keyboard.
 *
 * Self-spaces with margin on reveal so parent `gap-*` is not required (and a
 * collapsed flex child does not leave a gap hole at rest on desktop).
 */
export function NavigateHoverArrow({
	className = '',
}: {
	className?: string;
}) {
	return (
		<span
			aria-hidden
			className={
				`
					inline-flex
					ml-1.5
					max-w-4
					shrink-0
					translate-x-0
					overflow-hidden
					opacity-100
					transition-[max-width,margin,opacity,transform]
					duration-200
					ease-out
					motion-reduce:transition-none
					lg:ml-0
					lg:max-w-0
					lg:translate-x-[-0.15rem]
					lg:opacity-0
					group-focus-visible:ml-1.5
					group-focus-visible:max-w-4
					group-focus-visible:translate-x-0
					group-focus-visible:opacity-100
					[@media(hover:hover)]:lg:group-hover:ml-1.5
					[@media(hover:hover)]:lg:group-hover:max-w-4
					[@media(hover:hover)]:lg:group-hover:translate-x-0
					[@media(hover:hover)]:lg:group-hover:opacity-100
					${className}
				`.trim()
			}
		>
			<ArrowRightIcon
				className="
					h-3.5
					w-3.5
					shrink-0
				"
			/>
		</span>
	);
}
