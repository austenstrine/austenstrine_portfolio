'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { CategoryIcon } from '../icons/CategoryIcon';
import { HomeIcon } from '../icons/HomeIcon';
import { LinkNameIcon } from '../icons/LinkNameIcon';
import { UomIcon } from '../icons/UomIcon';
import {
	logoutUser,
	probeCurrentUser,
	type AuthUser,
} from '../../lib/auth-api';

const NAV = [
	{ href: '/', label: 'Home', Icon: HomeIcon },
	{ href: '/link-names', label: 'Link names', Icon: LinkNameIcon },
	{ href: '/categories', label: 'Categories', Icon: CategoryIcon },
	{ href: '/uoms', label: 'Units', Icon: UomIcon },
	{ href: '/uom-merges', label: 'UOM approvals', Icon: UomIcon },
] as const;

type Props = {
	children: ReactNode;
	requireAuth?: boolean;
};

export function CrmShell({ children, requireAuth = true }: Props) {
	const pathname = usePathname();
	const router = useRouter();
	const [user, setUser] = useState<AuthUser | null>(null);
	const [ready, setReady] = useState(!requireAuth);
	const [menuOpen, setMenuOpen] = useState(false);

	useEffect(() => {
		if(!requireAuth) {
			return;
		}
		let cancelled = false;
		void (async () => {
			const probe = await probeCurrentUser();
			if(cancelled) {
				return;
			}
			if(probe.status !== 'ok') {
				const next = encodeURIComponent(pathname || '/');
				router.replace(`/login?next=${next}`);
				return;
			}
			setUser(probe.user);
			setReady(true);
		})();
		return () => {
			cancelled = true;
		};
	}, [pathname, requireAuth, router]);

	async function onLogout() {
		try {
			await logoutUser();
		}
		catch {
			/* still leave */
		}
		router.replace('/login');
	}

	const nav = (
		<nav
			className="
				flex
				flex-col
				gap-1
				p-3
			"
			aria-label="CRM"
		>
			{NAV.map(({ href, label, Icon }) => {
				const active =
					href === '/'
						? pathname === '/'
						: pathname === href || pathname.startsWith(`${href}/`);
				return (
					<Link
						key={href}
						href={href}
						onClick={() => setMenuOpen(false)}
						className={`
							flex
							items-center
							gap-3
							rounded-lg
							px-3
							py-2.5
							text-sm
							font-medium
							transition
							${active
								? 'bg-glow/15 text-glow'
								: 'text-mist/80 hover:bg-line/40 hover:text-mist'
							}
						`}
					>
						<Icon
							className="
								h-4
								w-4
								shrink-0
							"
						/>
						{label}
					</Link>
				);
			})}
		</nav>
	);

	if(requireAuth && !ready) {
		return (
			<div
				className="
					flex
					min-h-screen
					items-center
					justify-center
					px-6
					text-sm
					text-mist/70
				"
			>
				Checking sign-in…
			</div>
		);
	}

	return (
		<div
			className="
				flex
				min-h-screen
			"
		>
			<aside
				className="
					hidden
					w-56
					shrink-0
					flex-col
					border-r
					border-line/80
					bg-panel/80
					backdrop-blur-sm
					md:flex
				"
			>
				<div
					className="
						border-b
						border-line/80
						px-4
						py-5
					"
				>
					<p
						className="
							text-[0.7rem]
							font-semibold
							uppercase
							tracking-[0.18em]
							text-glow/90
						"
					>
						CRM
					</p>
					<p
						className="
							mt-1
							text-base
							font-semibold
							tracking-tight
							text-white
						"
					>
						austenstrine
					</p>
				</div>
				{nav}
				{user
					? (
							<div
								className="
									mt-auto
									border-t
									border-line/80
									p-4
									text-xs
									text-mist/60
								"
							>
								<p className="truncate">
									{user.email}
								</p>
								<button
									type="button"
									className="
										mt-2
										text-mist/80
										underline-offset-2
										hover:text-mist
										hover:underline
									"
									onClick={() => {
										void onLogout();
									}}
								>
									Sign out
								</button>
							</div>
						)
					: null
				}
			</aside>

			<div
				className="
					flex
					min-w-0
					flex-1
					flex-col
				"
			>
				<header
					className="
						flex
						items-center
						justify-between
						gap-3
						border-b
						border-line/80
						bg-panel/50
						px-[var(--gutter)]
						py-3
						md:hidden
					"
				>
					<div>
						<p
							className="
								text-[0.65rem]
								font-semibold
								uppercase
								tracking-[0.18em]
								text-glow/90
							"
						>
							CRM
						</p>
						<p className="text-sm font-semibold text-white">
							austenstrine
						</p>
					</div>
					<button
						type="button"
						className="
							rounded-lg
							border
							border-line
							px-3
							py-1.5
							text-sm
							text-mist
						"
						aria-expanded={menuOpen}
						aria-controls="crm-mobile-nav"
						onClick={() => setMenuOpen((open) => !open)}
					>
						{menuOpen
							? 'Close'
							: 'Menu'
						}
					</button>
				</header>

				{menuOpen
					? (
							<div
								id="crm-mobile-nav"
								className="
									border-b
									border-line/80
									bg-panel
									md:hidden
								"
							>
								{nav}
								{user
									? (
											<div
												className="
													border-t
													border-line/80
													p-4
													text-xs
													text-mist/60
												"
											>
												<p className="truncate">
													{user.email}
												</p>
												<button
													type="button"
													className="
														mt-2
														text-mist/80
														underline-offset-2
														hover:underline
													"
													onClick={() => {
														void onLogout();
													}}
												>
													Sign out
												</button>
											</div>
										)
									: null
								}
							</div>
						)
					: null
				}

				<main
					className="
						flex-1
						px-[var(--gutter)]
						py-8
					"
				>
					{children}
				</main>
			</div>
		</div>
	);
}
