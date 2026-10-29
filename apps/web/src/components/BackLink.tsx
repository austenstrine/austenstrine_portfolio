import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';

export function BackLink({
	href,
	children,
}: {
	href: string;
	children: ReactNode;
}) {
	return (
		<Link
			className="
				inline-flex
				items-center
				gap-1
				text-sm
				font-semibold
				text-sky
				hover:underline
			"
			href={href}
		>
			<ArrowLeftIcon
				className="h-4 w-4"
			/>
			{children}
		</Link>
	);
}
