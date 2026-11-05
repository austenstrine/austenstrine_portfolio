'use client';

import Link from 'next/link';
import {
	useEffect,
	useState,
	type ReactNode,
} from 'react';
import {
	forgetWidgetState,
	getWidgetPref,
	rememberWidgetState,
	subscribeWidgetPrefs,
	widgetPrefsUserKey,
} from '../../lib/widget-prefs';
import { useSession } from '../../lib/useSession';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { MoreVerticalIcon } from '../icons/MoreVerticalIcon';
import {
	CatalogMenuRow,
	CatalogMenuSurface,
	useCatalogFloatingMenu,
} from './CatalogMenu';
import { useWidgetPrefsChrome } from './WidgetPrefsProvider';

export const WIDGET_PREFS_MANAGE_HREF = '/place-et-marque/preferences';

const toggleClassName = `
	inline-flex
	h-8
	w-8
	shrink-0
	items-center
	justify-center
	gap-1.5
	rounded-full
	border
	border-slate-200
	bg-white
	text-xs
	font-semibold
	text-slate-600
	transition
	hover:border-sky
	hover:text-sky
	sm:h-auto
	sm:w-auto
	sm:px-3
	sm:py-1
`;

export function CollapsibleWidget({
	children,
	collapseLabel = 'Close',
	expandLabel,
	id,
	label,
	onOpenChange,
	open,
	panelId,
	title,
	widgetId,
}: {
	children: ReactNode;
	collapseLabel?: string;
	expandLabel: string;
	id?: string;
	label: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	panelId: string;
	title: ReactNode;
	widgetId: string;
}) {
	const { user } = useSession();
	const userKey = widgetPrefsUserKey(user?.id);
	const { altHeld } = useWidgetPrefsChrome();
	const [rememberedOpen, setRememberedOpen] = useState<boolean | null>(null);
	const [headerFocused, setHeaderFocused] = useState(false);
	const [headerHovered, setHeaderHovered] = useState(false);
	const {
		open: menuOpen,
		panelBox,
		panelRef,
		setOpen: setMenuOpen,
		triggerRef,
	} = useCatalogFloatingMenu({
		align: 'end',
		closeKey: widgetId,
	});

	useEffect(() => {
		const sync = () => {
			const pref = getWidgetPref(userKey, widgetId);
			setRememberedOpen(
				pref
					? pref.open
					: null,
			);
		};
		sync();
		return subscribeWidgetPrefs(userKey, sync);
	}, [userKey, widgetId]);

	// Faint ⋮ is always painted (discovery + forward Tab). Alt / hover / focus
	// only boost contrast — absolute slot + pr-10 gutter keep CLS at zero.
	const prefsChromeEmphasized =
		altHeld || menuOpen || headerFocused || headerHovered;
	const isRemembering = rememberedOpen !== null;
	const rememberMatches = isRemembering && rememberedOpen === open;

	return (
		<section
			className="
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-5
			"
			id={id}
		>
			<div
				className="
					relative
					flex
					items-center
					justify-between
					gap-2
				"
				onBlur={(event) => {
					if(!event.currentTarget.contains(event.relatedTarget as Node | null)) {
						setHeaderFocused(false);
					}
				}}
				onFocus={() => setHeaderFocused(true)}
				onMouseEnter={() => setHeaderHovered(true)}
				onMouseLeave={() => setHeaderHovered(false)}
			>
				<div
					className="
						relative
						min-w-0
						pr-10
					"
				>
					<h2 className="text-lg font-semibold">
						{title}
					</h2>
					<button
						aria-expanded={menuOpen}
						aria-haspopup="menu"
						aria-label={`Preferences for ${label}`}
						className={
							prefsChromeEmphasized
								? `
									absolute
									-right-1
									top-1/2
									inline-flex
									h-8
									w-8
									-translate-y-1/2
									items-center
									justify-center
									rounded-full
									border
									border-slate-200
									bg-white
									text-slate-600
									opacity-100
									transition
									hover:border-sky
									hover:text-sky
								`
								: `
									absolute
									-right-1
									top-1/2
									inline-flex
									h-8
									w-8
									-translate-y-1/2
									items-center
									justify-center
									rounded-full
									border
									border-slate-200/70
									bg-white/80
									text-slate-500
									opacity-40
									transition
									hover:border-sky
									hover:text-sky
									hover:opacity-100
								`
						}
						onClick={() => setMenuOpen((current) => !current)}
						ref={triggerRef}
						title="Widget preferences (or hold Alt)"
						type="button"
					>
						<MoreVerticalIcon className="h-4 w-4" />
					</button>
					{menuOpen && panelBox
						? (
								<CatalogMenuSurface
									panelBox={panelBox}
									panelRef={panelRef}
								>
									<CatalogMenuRow
										active={rememberMatches}
										onClick={() => {
											if(rememberMatches) {
												forgetWidgetState(userKey, widgetId);
											}
											else {
												rememberWidgetState(
													userKey,
													widgetId,
													open,
													label,
												);
											}
											setMenuOpen(false);
										}}
									>
										{rememberMatches
											? 'Forget remembered state'
											: 'Remember the state of this widget'
										}
									</CatalogMenuRow>
									<Link
										className="
											flex
											w-full
											items-center
											justify-between
											gap-3
											rounded-full
											px-3.5
											py-2
											text-left
											text-sm
											text-ink
											hover:bg-frost
										"
										href={WIDGET_PREFS_MANAGE_HREF}
										onClick={() => setMenuOpen(false)}
										role="menuitem"
									>
										Manage all preferences
									</Link>
								</CatalogMenuSurface>
							)
						: null
					}
				</div>
				{open
					? (
							<button
								aria-controls={panelId}
								aria-expanded={true}
								aria-label={collapseLabel === 'Close'
									? `Close ${label}`
									: collapseLabel
								}
								className={toggleClassName}
								onClick={() => onOpenChange(false)}
								type="button"
							>
								<CloseIcon
									className="
										h-3
										w-3
										shrink-0
									"
								/>
								<span
									className="
										hidden
										sm:inline
									"
								>
									{collapseLabel}
								</span>
							</button>
						)
					: (
							<button
								aria-controls={panelId}
								aria-expanded={false}
								aria-label={expandLabel}
								className={toggleClassName}
								onClick={() => onOpenChange(true)}
								type="button"
							>
								<span
									className="
										hidden
										sm:inline
									"
								>
									{expandLabel}
								</span>
								<ArrowRightIcon
									className="
										h-3
										w-3
										shrink-0
									"
								/>
							</button>
						)
				}
			</div>
			<div
				aria-hidden={!open}
				className={
					open
						? `
							grid
							grid-rows-[1fr]
							opacity-100
							transition-[grid-template-rows]
							duration-300
							ease-out
						`
						: `
							hidden
							grid
							grid-rows-[0fr]
							opacity-0
							transition-[grid-template-rows]
							duration-300
							ease-out
						`
				}
				id={panelId}
				ref={(el) => {
					if(el) {
						el.inert = !open;
					}
				}}
			>
				<div className="overflow-hidden">
					{children}
				</div>
			</div>
		</section>
	);
}
