import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';

/**
 * Always-visible shafted navigate cue.
 * Nudges on group-hover / group-focus-visible — same motion as featured-build
 * card CTAs (`transition-transform` + `translate-x-0.5` / `-translate-x-0.5`).
 *
 * Prefer {@link NavigateHoverArrow} when desktop should hide the arrow at rest.
 */
export function NavigatePersistentArrow({
	className = '',
	direction = 'right',
	iconClassName = `
		h-3.5
		w-3.5
		shrink-0
	`,
}: {
	className?: string;
	direction?: 'left' | 'right';
	iconClassName?: string;
}) {
	const Icon = direction === 'left'
		? ArrowLeftIcon
		: ArrowRightIcon;
	const nudge = direction === 'left'
		? `
			group-hover:-translate-x-0.5
			group-focus-visible:-translate-x-0.5
		`
		: `
			group-hover:translate-x-0.5
			group-focus-visible:translate-x-0.5
		`;

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
					${nudge}
					${className}
				`.trim()
			}
		>
			<Icon
				className={iconClassName}
			/>
		</span>
	);
}
