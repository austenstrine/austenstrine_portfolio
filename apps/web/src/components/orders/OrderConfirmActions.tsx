type OrderConfirmActionsProps = {
	prompt: string;
	confirmLabel: string;
	busy: boolean;
	busyLabel?: string;
	onConfirm: () => void;
	onDismiss: () => void;
};

export function OrderConfirmActions({
	prompt,
	confirmLabel,
	busy,
	busyLabel = 'Working…',
	onConfirm,
	onDismiss,
}: OrderConfirmActionsProps) {
	return (
		<div
			className="
				flex
				w-full
				flex-col
				items-end
				gap-2
			"
		>
			<p
				className="
					text-right
					text-sm
					font-semibold
					text-slate-800
				"
			>
				{prompt}
			</p>
			<div
				className="
					flex
					flex-wrap
					justify-end
					gap-2
				"
			>
				<button
					className="
						rounded-full
						border
						border-slate-300
						bg-white
						px-4
						py-2
						text-sm
						font-semibold
						text-ink
						hover:border-slate-400
						disabled:opacity-60
					"
					disabled={busy}
					onClick={onDismiss}
					type="button"
				>
					Never mind
				</button>
				<button
					className="
						rounded-full
						border
						border-red-300
						bg-white
						px-4
						py-2
						text-sm
						font-semibold
						text-red-700
						hover:border-red-500
						disabled:opacity-60
					"
					disabled={busy}
					onClick={onConfirm}
					type="button"
				>
					{busy
						? busyLabel
						: confirmLabel
					}
				</button>
			</div>
		</div>
	);
}
