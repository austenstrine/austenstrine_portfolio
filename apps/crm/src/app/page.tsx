'use client';

import Link from 'next/link';
import { CrmShell } from '../components/layout/CrmShell';

const TOOLS = [
	{ href: '/link-names', title: 'Link names' },
	{ href: '/categories', title: 'Categories' },
	{ href: '/uoms', title: 'Units' },
	{ href: '/uom-merges', title: 'Unit merges' },
] as const;

export default function CrmHomePage() {
	return (
		<CrmShell>
			<div
				className="
					mx-auto
					max-w-3xl
				"
			>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
						text-white
					"
				>
					CRM
				</h1>

				<section
					className="
						mt-8
						divide-y
						divide-line/80
						border-y
						border-line/80
					"
				>
					{TOOLS.map((tool) => (
						<Link
							key={tool.href}
							href={tool.href}
							className="
								block
								px-1
								py-4
								text-sm
								font-semibold
								text-white
								transition
								hover:text-glow
							"
						>
							{tool.title}
						</Link>
					))}
				</section>
			</div>
		</CrmShell>
	);
}
