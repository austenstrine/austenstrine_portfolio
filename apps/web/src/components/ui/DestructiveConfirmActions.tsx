type DestructiveConfirmActionsProps = {
	prompt: string;
	detail?: string;
	/** When true, show an explicit irreversible warning. */
	irreversible?: boolean;
	confirmLabel: string;
	busy: boolean;
	busyLabel?: string;
	onConfirm: () => void;
	onDismiss: () => void;
	secondaryConfirmLabel?: string;
	onSecondaryConfirm?: () => void;
	secondaryBusy?: boolean;
	secondaryBusyLabel?: string;
};

export function DestructiveConfirmActions({
	prompt,
	detail,
	irreversible = false,
	confirmLabel,
	busy,
	busyLabel = 'Working…',
	onConfirm,
	onDismiss,
	secondaryConfirmLabel,
	onSecondaryConfirm,
	secondaryBusy = false,
	secondaryBusyLabel = 'Working…',
}: DestructiveConfirmActionsProps) {
	const anyBusy = busy || secondaryBusy;

	return (
		<div
			className="
				flex
				w-full
				flex-col
				items-end
				gap-2
			"
			role="group"
			aria-label="Confirm destructive action"
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
			{detail
				? (
					<p
						className="
							max-w-[18rem]
							text-right
							text-xs
							text-slate-600
						"
					>
						{detail}
					</p>
				)
				: null
			}
			{irreversible
				? (
					<p
						className="
							max-w-[18rem]
							text-right
							text-xs
							font-semibold
							text-red-700
						"
					>
						This cannot be undone.
					</p>
				)
				: null
			}
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
					disabled={anyBusy}
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
					disabled={anyBusy}
					onClick={onConfirm}
					type="button"
				>
					{busy
						? busyLabel
						: confirmLabel
					}
				</button>
				{secondaryConfirmLabel && onSecondaryConfirm
					? (
						<button
							className="
								rounded-full
								border
								border-red-600
								bg-red-700
								px-4
								py-2
								text-sm
								font-semibold
								text-white
								hover:bg-red-800
								disabled:opacity-60
							"
							disabled={anyBusy}
							onClick={onSecondaryConfirm}
							type="button"
						>
							{secondaryBusy
								? secondaryBusyLabel
								: secondaryConfirmLabel
							}
						</button>
					)
					: null
				}
			</div>
		</div>
	);
}
