const paragraphs = [
	'I do my best work on teams that need more than raw output. I help people stay aligned, keep projects moving, and lower the day-to-day friction that quietly slows good teams down.',
	'With 6.5 years of professional experience across web and mobile development, I build full-stack features from concept to production. Just as often, I step into the messy middle: clarifying direction, unblocking coworkers, and giving the team a calmer path through high-pressure work.',
	'At Lumber Marketplace, that meant building proprietary tools like a regex synthesis engine for textual data processing and Prisma code generators that removed a large amount of repetitive work across the application. The technical work mattered, but so did making the rest of the team faster and less stuck.',
	'I tend to fit best on small, capable teams with ambitious timelines. My background in sales, customer service, and theater made me comfortable with pressure, direct communication, and the human side of technical work, which helps when a team needs trust as much as it needs code.',
	'If you need someone who can ship solid software, steady a room, and leave the team working better together than before, that\'s the role I tend to fill.',
];

export function AboutSection() {
	return (
		<section
			id="about"
			className="
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-8
				md:grid
				md:grid-cols-[1fr,240px]
				md:gap-x-8
				shadow-sm
			"
		>
			<h2
				className="
					text-3xl
					font-semibold
					text-ink
					md:col-start-1
				"
			>
				About Me
			</h2>
			<div
				className="
					mt-6
					space-y-4
					text-slate-700
					md:col-start-1
				"
			>
				{
					paragraphs.map((paragraph) => (
						<p key={paragraph}>
							{paragraph}
						</p>
					))
				}
			</div>
			<img
				src="/pp5_sq_sm.jpg"
				alt="Austen Strine portrait"
				className="
					mx-auto
					mt-6
					h-60
					w-60
					rounded-full
					border-4
					border-emerald-700
					object-cover
					shadow-xl
					md:col-start-2
					md:row-span-2
					md:row-start-1
					md:mt-0
					md:self-start
					md:sticky
					md:top-[calc(50vh-7.5rem)]
				"
			/>
		</section>
	);
}
