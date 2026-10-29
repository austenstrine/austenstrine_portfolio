import { CdnImg } from '../CdnImg';
import { SITE_HEADLINE } from '../../lib/site';

export function HeroSection() {
	return (
		<section
			className="
				relative
				rounded-3xl
				bg-gradient-to-br
				from-ink
				via-sky
				to-asgreen
				px-8
				py-16
				text-white
				shadow-2xl
			"
		>
			<div
				className="
					grid
					items-center
					gap-8
					md:grid-cols-[220px,1fr]
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
						Six and a half years of paid software work on catalog, search, and live
						commerce sites. I live in Parowan, Utah. I am in Murray Mondays and
						Tuesdays, and I am moving there full-time in December 2026. Open to
						on-site and hybrid roles in the Salt Lake Valley.
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
