export function CatalogNotFound({
	title = 'Not found',
	detail = 'This page loaded, but that catalog item is missing or the link is out of date.',
}: {
	title?: string;
	detail?: string;
}) {
	return (
		<div
			className="
				rounded-2xl
				border
				border-sky/15
				bg-white
				p-6
				text-ink
			"
			role="status"
		>
			<p className="text-lg font-semibold">
				{title}
			</p>
			<p className="mt-2 text-sm text-ink/70">
				{detail}
			</p>
		</div>
	);
}
