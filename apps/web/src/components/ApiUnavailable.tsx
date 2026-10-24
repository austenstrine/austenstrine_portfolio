export function ApiUnavailable({
	title = "We're currently down",
	detail = 'This page loaded, but the API could not be reached.',
}: {
	title?: string;
	detail?: string;
}) {
	return (
		<div
			className="
				rounded-2xl
				border
				border-amber-200
				bg-amber-50
				p-6
				text-amber-950
			"
			role="status"
		>
			<p className="text-lg font-semibold">
				{title}
			</p>
			<p className="mt-2 text-sm">
				{detail}
			</p>
		</div>
	);
}
