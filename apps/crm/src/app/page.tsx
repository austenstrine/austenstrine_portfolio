'use client';

import Link from 'next/link';
import { CrmShell } from '../components/layout/CrmShell';

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
					Admin CRM
				</h1>
				<p
					className="
						mt-3
						max-w-xl
						text-sm
						leading-relaxed
						text-mist/75
					"
				>
					Platform tools for Place et Marque. Sellers keep working in the storefront;
					reviews and approvals live here.
				</p>

				<section
					className="
						mt-10
						grid
						gap-4
					"
				>
					<Link
						href="/link-names"
						className="
							group
							rounded-xl
							border
							border-line
							bg-panel/70
							px-5
							py-4
							transition
							hover:border-glow/40
							hover:bg-panel
						"
					>
						<p
							className="
								text-sm
								font-semibold
								text-white
								group-hover:text-glow
							"
						>
							Link name requests
						</p>
						<p
							className="
								mt-1
								text-sm
								text-mist/65
							"
						>
							Approve or deny sellers who want a different name in their organization link.
						</p>
					</Link>
				</section>
			</div>
		</CrmShell>
	);
}
