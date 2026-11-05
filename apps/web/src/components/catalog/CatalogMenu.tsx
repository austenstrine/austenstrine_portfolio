'use client';

import {
	useEffect,
	useRef,
	useState,
	type ReactNode,
	type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

export type CatalogMenuBox = {
	left: number;
	top: number;
	width: number;
};

export function CatalogMenuRow({
	active = false,
	children,
	onClick,
}: {
	active?: boolean;
	children: ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			className={
				active
					? `
						flex
						w-full
						items-center
						justify-between
						gap-3
						rounded-full
						bg-asgreen/15
						px-3.5
						py-2
						text-left
						text-sm
						font-semibold
						text-asgreen
					`
					: `
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
					`
			}
			onClick={onClick}
			role="menuitem"
			type="button"
		>
			{children}
		</button>
	);
}

export function CatalogMenuSurface({
	children,
	panelBox,
	panelRef,
}: {
	children: ReactNode;
	panelBox: CatalogMenuBox;
	panelRef: RefObject<HTMLDivElement | null>;
}) {
	if(typeof document === 'undefined') {
		return null;
	}

	return createPortal(
		<div
			className="
				fixed
				z-50
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-2
				shadow-lg
			"
			ref={panelRef as RefObject<HTMLDivElement>}
			role="menu"
			style={{
				left: panelBox.left,
				top: panelBox.top,
				width: panelBox.width,
			}}
		>
			<div
				className="
					max-h-80
					space-y-0.5
					overflow-y-auto
					scrollbar-thin-quiet
				"
			>
				{children}
			</div>
		</div>,
		document.body,
	);
}

let gutterCache = {
	px: 8,
	viewport: -1,
};

function readCatalogGutterPx() {
	const viewport = document.documentElement.clientWidth;
	if(gutterCache.viewport === viewport) {
		return gutterCache.px;
	}
	const probe = document.createElement('div');
	probe.style.cssText = 'position:absolute;width:var(--gutter);visibility:hidden;pointer-events:none';
	document.documentElement.appendChild(probe);
	const px = probe.getBoundingClientRect().width;
	probe.remove();
	gutterCache = {
		px: px > 0 ? px : 8,
		viewport,
	};
	return gutterCache.px;
}

export function useCatalogFloatingMenu({
	align = 'start',
	closeKey,
	onEscape,
}: {
	align?: 'start' | 'end';
	closeKey?: unknown;
	onEscape?: () => boolean;
} = {}) {
	const triggerRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [panelBox, setPanelBox] = useState<CatalogMenuBox | null>(null);
	const onEscapeRef = useRef(onEscape);
	onEscapeRef.current = onEscape;

	useEffect(() => {
		setOpen(false);
	}, [closeKey]);

	useEffect(() => {
		if(!open) {
			return;
		}

		const place = () => {
			const rect = triggerRef.current?.getBoundingClientRect();
			if(!rect) {
				return;
			}
			const gutter = readCatalogGutterPx();
			const viewport = document.documentElement.clientWidth;
			const maxWidth = Math.max(gutter, viewport - gutter * 2);
			const width = Math.min(maxWidth, 288, Math.max(rect.width + 48, 220));
			const minLeft = gutter;
			const maxLeft = viewport - width - gutter;
			const preferredLeft = align === 'end'
				? rect.right - width
				: rect.left;
			const left = Math.min(maxLeft, Math.max(minLeft, preferredLeft));
			let top = rect.bottom + 6;
			const maxHeight = 320;
			if(top + maxHeight > window.innerHeight - gutter) {
				top = Math.max(gutter, rect.top - maxHeight - 6);
			}
			setPanelBox({
				left,
				top,
				width,
			});
		};

		const menuItems = () =>
			[
				...(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
			];

		const closeMenu = (restoreTriggerFocus = true) => {
			setOpen(false);
			if(restoreTriggerFocus) {
				triggerRef.current?.focus();
			}
		};

		place();
		window.addEventListener('resize', place);
		window.addEventListener('scroll', place, true);

		let focusAttempts = 0;
		let focusFrame = 0;
		const focusFirstItem = () => {
			const first = menuItems()[0];
			if(first) {
				first.focus();
				return;
			}
			focusAttempts += 1;
			if(focusAttempts < 12) {
				focusFrame = requestAnimationFrame(focusFirstItem);
			}
		};
		focusFrame = requestAnimationFrame(focusFirstItem);

		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			if(triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
				return;
			}
			closeMenu(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			const items = menuItems();
			const activeIndex = items.findIndex((item) => item === document.activeElement);

			if(event.key === 'Escape') {
				if(onEscapeRef.current?.()) {
					return;
				}
				event.preventDefault();
				closeMenu(true);
				return;
			}

			if(items.length === 0) {
				return;
			}

			if(event.key === 'ArrowDown') {
				event.preventDefault();
				const next = activeIndex < 0
					? 0
					: (activeIndex + 1) % items.length;
				items[next]?.focus();
				return;
			}

			if(event.key === 'ArrowUp') {
				event.preventDefault();
				const next = activeIndex <= 0
					? items.length - 1
					: activeIndex - 1;
				items[next]?.focus();
				return;
			}

			if(event.key === 'Home') {
				event.preventDefault();
				items[0]?.focus();
				return;
			}

			if(event.key === 'End') {
				event.preventDefault();
				items[items.length - 1]?.focus();
				return;
			}

			if(event.key !== 'Tab') {
				return;
			}

			// Keep Tab inside the open menu (portal items are otherwise last in document order).
			event.preventDefault();
			if(items.length === 1) {
				items[0]?.focus();
				return;
			}
			if(event.shiftKey) {
				const next = activeIndex <= 0
					? items.length - 1
					: activeIndex - 1;
				items[next]?.focus();
				return;
			}
			const next = activeIndex < 0
				? 0
				: (activeIndex + 1) % items.length;
			items[next]?.focus();
		};

		document.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('keydown', onKeyDown);
		return () => {
			cancelAnimationFrame(focusFrame);
			window.removeEventListener('resize', place);
			window.removeEventListener('scroll', place, true);
			document.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [align, open]);

	return {
		open,
		panelBox,
		panelRef,
		setOpen,
		triggerRef,
	};
}
