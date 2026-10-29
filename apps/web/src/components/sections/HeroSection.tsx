import { CdnImg } from '../CdnImg';
import { DocumentIcon } from '../icons/DocumentIcon';
import { EmailIcon } from '../icons/EmailIcon';
import { GithubIcon } from '../icons/GithubIcon';
import { LinkedInIcon } from '../icons/LinkedInIcon';
import {
	SITE_GITHUB,
	SITE_HEADLINE,
	SITE_LINKEDIN,
} from '../../lib/site';

export function HeroSection() {
	return (
		<section
			className="
				relative
				overflow-hidden
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
			<div
				className="
					grid
					items-center
					gap-10
					md:grid-cols-[auto,1fr]
				"
			>
				<CdnImg
					className="
						mx-auto
						h-56
						w-56
						rounded-full
						border-4
						border-white/50
						object-cover
						shadow-2xl
						md:mx-0
					"
					src="/pp1_sq_sm.jpg"
					cdn={{ w: 448, h: 448, fit: 'cover', fm: 'webp' }}
					alt="Austen Strine"
				/>
				<div>
					<p
						className="
							inline-flex
							rounded-full
							border
							border-white/20
							bg-white/10
							px-3
							py-1
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
							mt-4
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
							text-white/90
						"
					>
						{SITE_HEADLINE}
					</p>
					<p
						className="
							mt-4
							max-w-2xl
							text-base
							leading-relaxed
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
							items-center
							gap-3
						"
					>
						<a
							className="
								inline-flex
								items-center
								gap-2
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
							<DocumentIcon className="h-4 w-4" />
							View CV
						</a>
						<a
							className="
								inline-flex
								items-center
								gap-2
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
							<EmailIcon className="h-4 w-4" />
							Email
						</a>
					</div>
					<div
						className="
							mt-6
							flex
							flex-wrap
							items-center
							gap-5
							text-sm
							text-white/80
						"
					>
						<a
							className="
								inline-flex
								items-center
								gap-2
								transition
								hover:text-white
							"
							href={SITE_LINKEDIN}
							rel="noreferrer"
							target="_blank"
						>
							<LinkedInIcon className="h-4 w-4" />
							LinkedIn
						</a>
						<a
							className="
								inline-flex
								items-center
								gap-2
								transition
								hover:text-white
							"
							href={SITE_GITHUB}
							rel="noreferrer"
							target="_blank"
						>
							<GithubIcon className="h-4 w-4" />
							GitHub
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}
