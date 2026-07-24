const skills = [
	{
		icon: '🚀',
		title: 'Frontend Development',
		summary: 'Next.js, TypeScript, Tailwind CSS, MUI, React, HTML5/CSS3, Responsive Design',
	},
	{
		icon: '⚡',
		title: 'Backend Development',
		summary: 'Node.js, Nest.js, PHP, Laravel, REST APIs, Prisma, PostgreSQL, MySQL, MongoDB',
	},
	{
		icon: '📱',
		title: 'Mobile & Native',
		summary: 'Swift (iOS), Mobile-first Design, App Store Deployment',
	},
	{
		icon: '☁️',
		title: 'Cloud & Infrastructure',
		summary: 'AWS, OpenSearch, Elasticsearch, Ubuntu/Apache, Bash, Git, CI/CD Pipelines',
	},
];

export function SkillsSection() {
	return (
		<section
			id="skills"
			className="
				rounded-2xl
				bg-gradient-to-br
				from-slate-100
				to-slate-200
				p-8
			"
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
				{skills.map((skill) => (
					<article
						key={skill.title}
						className="
							rounded-xl
							bg-white
							p-5
							shadow-sm
						"
					>
						<div
							className="
								text-3xl
							"
						>
							{skill.icon}
						</div>
						<h3
							className="
								mt-2
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
				))}
			</div>
		</section>
	);
}
