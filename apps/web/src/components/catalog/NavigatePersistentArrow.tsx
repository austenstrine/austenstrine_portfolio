import { ArrowRightIcon } from '../icons/ArrowRightIcon';

/**
 * Always-visible shafted navigate cue.
 * Nudges on group-hover / group-focus-visible — same motion as featured-build
 * card CTAs (`transition-transform` + `translate-x-0.5`).
 *
 * Prefer {@link NavigateHoverArrow} when desktop should hide the arrow at rest.
 */
export function NavigatePersistentArrow({
	className = '',
	iconClassName = `
		h-3.5
		w-3.5
		shrink-0
	`,
}: {
	className?: string;
	iconClassName?: string;
}) {
	return (
		<span
			aria-hidden
			className={
				`
					inline-flex
					shrink-0
					transition-transform
					duration-200
					ease-out
					motion-reduce:transition-none
					group-hover:translate-x-0.5
					group-focus-visible:translate-x-0.5
					${className}
				`.trim()
			}
		>
			<ArrowRightIcon
				className={iconClassName}
			/>
		</span>
	);
}
