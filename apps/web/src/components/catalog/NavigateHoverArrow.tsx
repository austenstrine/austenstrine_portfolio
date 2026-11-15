import { ArrowRightIcon } from '../icons/ArrowRightIcon';

/**
 * Shafted navigate cue for whole-card / pill rows.
 * Below `lg` (tablet and smaller): always visible — touch has no hover.
 * At `lg+` (desktop): hidden at rest; animates in under `(hover: hover)` +
 * group-hover, or group-focus-visible for keyboard.
 *
 * Always reserves `ml-1.5` + icon width so reveal does not shift the label
 * or neighboring flex items (footer hop). Opacity/transform only — appear
 * uses ease-out, disappear uses ease-in (mirrored curve).
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
					h-3.5
					w-3.5
					shrink-0
					translate-x-0
					opacity-100
					transition-[opacity,transform]
					duration-200
					ease-in
					motion-reduce:transition-none
					group-hover:translate-x-0.5
					group-hover:ease-out
					group-focus-visible:translate-x-0.5
					group-focus-visible:ease-out
					lg:translate-x-[-0.15rem]
					lg:opacity-0
					group-focus-visible:opacity-100
					[@media(hover:hover)]:lg:group-hover:translate-x-0.5
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
