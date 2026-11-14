import { ArrowRightIcon } from '../icons/ArrowRightIcon';

/**
 * Shafted navigate cue for whole-card / pill rows: hidden at rest, animates in
 * only when the pointer can hover (`(hover: hover)` + group-hover) or on
 * keyboard focus-visible — so touch taps do not leave a stuck arrow.
 *
 * Self-spaces with margin on reveal so parent `gap-*` is not required (and a
 * collapsed flex child does not leave a gap hole at rest).
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
					max-w-0
					shrink-0
					translate-x-[-0.15rem]
					overflow-hidden
					opacity-0
					transition-[max-width,margin,opacity,transform]
					duration-200
					ease-out
					motion-reduce:transition-none
					group-focus-visible:ml-1.5
					group-focus-visible:max-w-4
					group-focus-visible:translate-x-0
					group-focus-visible:opacity-100
					[@media(hover:hover)]:group-hover:ml-1.5
					[@media(hover:hover)]:group-hover:max-w-4
					[@media(hover:hover)]:group-hover:translate-x-0
					[@media(hover:hover)]:group-hover:opacity-100
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
