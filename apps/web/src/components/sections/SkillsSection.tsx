const skills = [
	{
		title: 'Frontend Development',
		summary: 'Next.js, TypeScript, Tailwind CSS, MUI, React, HTML5/CSS3, Responsive Design',
	},
	{
		title: 'Backend Development',
		summary: 'Node.js, Nest.js, PHP, Laravel, REST APIs, Prisma, PostgreSQL, MySQL, MongoDB',
	},
	{
		title: 'Mobile & Native',
		summary: 'Swift (iOS), Mobile-first Design, App Store Deployment',
	},
	{
		title: 'Cloud & Infrastructure',
		summary: 'AWS, OpenSearch, Elasticsearch, Ubuntu/Apache, Bash, Git, CI/CD Pipelines',
	},
];

export function SkillsSection() {
	return (
		<section
			className="
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-8
				shadow-sm
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
				Skills & Expertise
			</h2>
			<div
				className="
					mt-6
					grid
					gap-4
					md:grid-cols-2
				"
			>
				{
					skills.map((skill) => (
						<article
							className="
								rounded-xl
								border
								border-slate-200
								bg-slate-50
								p-5
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
									mt-2
									text-sm
									text-slate-700
								"
							>
								{skill.summary}
							</p>
						</article>
					))
				}
			</div>
		</section>
	);
}
