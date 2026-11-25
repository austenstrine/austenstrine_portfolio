'use client';

import { CdnImg } from '../CdnImg';
import { NavigatePersistentArrow } from '../catalog/NavigatePersistentArrow';
import { PILL_CTA_BASE_CLASS } from '../catalog/pillCta';
import { useHomepageTailor } from '../../lib/homepage-tailor';

export function HeroSection() {
	const { headline, blurb } = useHomepageTailor();

	return (
		<section
			className="
				relative
				rounded-none
				sm:rounded-3xl
				bg-gradient-to-br
				from-sky
				to-asgreen
				flex
				min-h-dvh
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
					width={208}
					height={208}
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
						Parowan, Utah · Murray in January 2027
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
						{headline}
					</p>
					<p
						className="
							mt-4
							max-w-2xl
							text-base
							text-slate-100
						"
					>
						{blurb}
					</p>
					<div
						className="
							mt-8
							flex
							flex-col
							items-stretch
							gap-3
							sm:flex-row
							sm:flex-wrap
							sm:justify-end
							sm:items-center
						"
					>
						<a
							className={`
								${PILL_CTA_BASE_CLASS}
								bg-white
								px-6
								py-3
								text-center
								text-ink
								hover:bg-frost
								max-[399px]:px-4
							`}
							href="/cv.html"
						>
							View CV
							<NavigatePersistentArrow />
						</a>
						<a
							className={`
								${PILL_CTA_BASE_CLASS}
								border
								border-white/60
								px-6
								py-3
								text-center
								text-white
								hover:bg-white/10
								max-[399px]:px-4
							`}
							href="#featured-build"
						>
							Explore a demo of my skills
							<NavigatePersistentArrow />
						</a>
						<a
							className={`
								${PILL_CTA_BASE_CLASS}
								border
								border-white/60
								px-6
								py-3
								text-center
								text-white
								hover:bg-white/10
								max-[399px]:px-4
							`}
							href="#contact"
						>
							Contact
							<NavigatePersistentArrow />
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
