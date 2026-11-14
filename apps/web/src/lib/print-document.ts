/**
 * Set document.title around window.print() so Save-as-PDF defaults to a useful name.
 * Restores the prior title on afterprint (with a long timeout fallback for WebKit).
 */
export function printWithDocumentTitle(
	title: string,
	options?: {
		beforePrint?: () => void;
		afterPrint?: () => void;
	},
): void {
	const previousTitle = document.title;
	let cleaned = false;

	const cleanup = () => {
		if(cleaned) {
			return;
		}
		cleaned = true;
		document.title = previousTitle;
		window.removeEventListener('afterprint', cleanup);
		options?.afterPrint?.();
	};

	options?.beforePrint?.();
	document.title = title;
	window.addEventListener('afterprint', cleanup);
	window.print();

	// Fallback if afterprint never fires (some WebKit builds). Keep long enough
	// that a still-open print dialog is not torn down by the timeout.
	window.setTimeout(cleanup, 60_000);
}
