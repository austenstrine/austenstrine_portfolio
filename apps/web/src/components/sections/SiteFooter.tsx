export function SiteFooter() {
	return (
		<footer
			className="
				relative
				-mt-6
				rounded-none
				bg-sky
				px-gutter
				py-6
				text-center
				text-sm
				text-slate-300
				before:pointer-events-none
				before:absolute
				before:inset-x-0
				before:-top-px
				before:h-0.5
				before:bg-sky
				before:content-['']
				sm:mt-0
				sm:rounded-2xl
				sm:bg-sky
				sm:before:hidden
			"
		>
			© 2026 Austen Strine
		</footer>
	);
}
