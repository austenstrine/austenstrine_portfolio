'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { NavigatePersistentArrow } from './catalog/NavigatePersistentArrow';

function canRollBackHistory(): boolean {
	if(typeof window === 'undefined') {
		return false;
	}
	if(window.history.length <= 1) {
		return false;
	}
	const ref = document.referrer;
	if(!ref) {
		return false;
	}
	try {
		return new URL(ref).origin === window.location.origin;
	}
	catch {
		return false;
	}
}

export function BackLink({
	href,
	children,
	className = `
		inline-flex
		items-center
		gap-1
		text-sm
		font-semibold
		text-sky
	`,
}: {
	/** Safe fallback when there is no same-origin history to roll back. */
	href: string;
	children: ReactNode;
	className?: string;
}) {
	const router = useRouter();

	return (
		<a
			className={
				`
					group
					${className}
				`.trim()
			}
			href={href}
			onClick={(event) => {
				if(
					event.defaultPrevented
					|| event.button !== 0
					|| event.metaKey
					|| event.altKey
					|| event.ctrlKey
					|| event.shiftKey
				) {
					return;
				}
				if(!canRollBackHistory()) {
					return;
				}
				event.preventDefault();
				router.back();
			}}
		>
			<NavigatePersistentArrow
				direction="left"
				iconClassName="
					h-4
					w-4
					shrink-0
				"
			/>
			{children}
		</a>
	);
}
