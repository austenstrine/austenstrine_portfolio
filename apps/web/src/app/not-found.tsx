import Link from 'next/link';

export default function NotFound() {
	return (
		<main
			className="
				flex
				min-h-screen
				items-center
				justify-center
				bg-frost
				px-gutter
			"
		>
			<div
				className="
					max-w-md
					text-center
				"
			>
				<p
					className="
						text-xs
						font-semibold
						uppercase
						tracking-[0.18em]
						text-sky
					"
				>
					404
				</p>
				<h1
					className="
						mt-3
						text-3xl
						font-semibold
						text-ink
					"
				>
					Page not found
				</h1>
				<p
					className="
						mt-3
						text-slate-600
					"
				>
					That address is not on this site.
				</p>
				<Link
					className="
						mt-6
						inline-block
						rounded-full
						bg-ink
						px-6
						py-3
						text-sm
						font-semibold
						text-white
					"
					href="/"
				>
					Back to home
				</Link>
			</div>
		</main>
	);
}
