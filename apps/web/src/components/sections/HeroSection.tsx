import { AccountMenu } from '../AccountMenu';

export function HeroSection() {
	return (
		<section
			className="
				relative
				rounded-3xl
				bg-gradient-to-br
				from-ink
				via-sky
				to-emerald-800
				px-8
				py-16
				text-white
				shadow-2xl
			"
		>
			<AccountMenu />

			<div
				className="
					grid
					items-center
					gap-8
					md:grid-cols-[220px,1fr]
				"
			>
				<img
					src="/pp1_sq_sm.jpg"
					alt="Austen Strine profile"
					className="
						mx-auto
						h-52
						w-52
						rounded-full
						border-4
						border-white/40
						object-cover
						shadow-2xl
					"
				/>
				<div>
					<h1
						className="
							text-4xl
							font-semibold
							tracking-tight
							md:text-5xl
						"
					>
						Austen Strine
					</h1>
					<p
						className="
							mt-4
							max-w-2xl
							text-lg
							text-slate-100
						"
					>
						Full-Stack Developer who makes teams sharper, steadier, and faster.
					</p>
					<a
						href="#contact"
						className="
							mt-8
							inline-block
							rounded-full
							bg-white
							px-6
							py-3
							text-sm
							font-semibold
							text-ink
							transition
							hover:-translate-y-0.5
							hover:bg-frost
						"
					>
						Get In Touch
					</a>
				</div>
			</div>
		</section>
	);
}
