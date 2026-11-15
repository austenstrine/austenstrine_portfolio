import { DestructiveConfirmActions } from '../ui/DestructiveConfirmActions';

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
		<DestructiveConfirmActions
			prompt={prompt}
			irreversible
			confirmLabel={confirmLabel}
			busy={busy}
			busyLabel={busyLabel}
			onConfirm={onConfirm}
			onDismiss={onDismiss}
		/>
	);
}
