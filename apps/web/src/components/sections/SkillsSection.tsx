const skills = [
	{
		title: 'Frontend',
		summary: 'Next.js, React, TypeScript, Tailwind CSS, MUI, HTML5, CSS3',
	},
	{
		title: 'Backend',
		summary: 'Node.js, NestJS (Nest.js), REST APIs, Prisma, PHP, Laravel',
	},
	{
		title: 'Data and search',
		summary: 'PostgreSQL (Postgres), MySQL, MongoDB, Elasticsearch, OpenSearch',
	},
	{
		title: 'Cloud and operations',
		summary: 'AWS, Ubuntu, Apache, Bash, Git, CI/CD',
	},
	{
		title: 'Mobile',
		summary:
			'Swift (iOS) and SQLite on a paid in-house app at GO Green. Dart/Flutter used there as well; TypeScript, Node.js, and React also from that period.',
	},
	{
		title: 'Working style',
		summary:
			'Unsupervised ownership, product-owner communication, junior mentorship, and production incident response.',
	},
];

export function SkillsSection() {
	return (
		<section
			className="
				rounded-none
				border
				border-slate-200
				bg-white
				p-ve-lg
				shadow-sm
				sm:rounded-2xl
			"
			id="skills"
		>
			<h2
				className="
					text-3xl
					font-semibold
					text-ink
				"
			>
				Skills
			</h2>
			<div
				className="
					mt-ve-1.5
					grid
					gap-ve
					md:grid-cols-2
				"
			>
				{skills.map((skill) => (
					<article
						className="
							rounded-xl
							border
							border-slate-200
							bg-slate-50
							p-ve-1.25
						"
						key={skill.title}
					>
						<h3
							className="
								text-lg
								font-semibold
								text-ink
							"
						>
							{skill.title}
						</h3>
						<p
							className="
								mt-ve-sm
								text-sm
								text-slate-700
							"
						>
							{skill.summary}
						</p>
					</article>
				))}
			</div>
		</section>
	);
}
