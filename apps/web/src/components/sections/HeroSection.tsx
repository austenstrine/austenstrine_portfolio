import { AccountMenu } from '../AccountMenu';
import { CdnImg } from '../CdnImg';
import { SITE_HEADLINE } from '../../lib/site';

export function HeroSection() {
	return (
		<section
			className="
				relative
				rounded-none
				sm:rounded-3xl
				bg-gradient-to-br
				from-ink
				via-sky
				to-asgreen
				flex
				min-h-screen
				items-center
				px-gutter
				py-4
				text-white
				shadow-2xl
				sm:block
				sm:min-h-0
				sm:py-16
			"
		>
			<AccountMenu />

			<div
				className="
					grid
					w-full
					items-center
					gap-5
					md:grid-cols-[220px,1fr]
					md:gap-8
				"
			>
				<CdnImg
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
					src="/pp1_sq_sm.jpg"
					cdn={{ w: 416, h: 416, fit: 'cover', fm: 'webp' }}
					alt="Austen Strine"
				/>
				<div>
					<p
						className="
							text-xs
							font-semibold
							uppercase
							tracking-[0.18em]
							text-white/80
						"
					>
						Parowan, Utah · Murray in December 2026
					</p>
					<h1
						className="
							mt-2
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
						{SITE_HEADLINE}
					</p>
					<p
						className="
							mt-4
							max-w-2xl
							text-base
							text-slate-100
						"
					>
						I&apos;ve spent six and a half years as a product, catalog, and search
						software engineer on commerce sites. I live in Parowan, Utah. I&apos;m
						in Murray Mondays and Tuesdays, and I&apos;m moving there full-time in
						December 2026. I&apos;m open to on-site and hybrid roles in the Salt
						Lake Valley.
					</p>
					<div
						className="
							mt-8
							flex
							flex-wrap
							gap-3
						"
					>
						<a
							className="
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
							href="/cv.html"
						>
							View CV
						</a>
						<a
							className="
								inline-block
								rounded-full
								border
								border-white/60
								px-6
								py-3
								text-sm
								font-semibold
								text-white
								transition
								hover:-translate-y-0.5
								hover:bg-white/10
							"
							href="/place-et-marque"
						>
							Open Place et Marque
						</a>
						<a
							className="
								inline-block
								rounded-full
								border
								border-white/60
								px-6
								py-3
								text-sm
								font-semibold
								text-white
								transition
								hover:-translate-y-0.5
								hover:bg-white/10
							"
							href="#contact"
						>
							Email
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
