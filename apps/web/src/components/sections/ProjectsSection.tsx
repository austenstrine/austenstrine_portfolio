import type { Project } from '../../lib/api';

type ProjectsSectionProps = {
	projects: Project[];
};

export function ProjectsSection({ projects }: ProjectsSectionProps) {
	return (
		<section 
			id="projects" 
			className="
				rounded-2xl 
				border 
				border-slate-200 
				bg-white 
				p-8 
				shadow-sm
			"
		>
			<h2 
				className="
					text-3xl 
					font-semibold 
					text-ink
				"
			>
				Featured Projects
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
					projects.length === 0 ? (
						<article 
							className="
								rounded-xl 
								border 
								border-dashed 
								border-slate-300 
								p-5 
								text-slate-600
							"
						>
							No projects found yet. Seed the database and refresh.
						</article>
					) : (
						projects.map((project) => (
							<article 
								key={project.id} 
								className="
									rounded-xl 
									border 
									border-slate-200 
									bg-slate-50 
									p-5
								"
							>
								<h3 
									className="
										text-lg 
										font-semibold 
										text-ink
									"
								>
									{project.title}
								</h3>
								<p 
									className="
										mt-2 
										text-sm 
										text-slate-700
									"
								>
									{project.summary}
								</p>
								<div 
									className="
										mt-3 
										flex 
										flex-wrap 
										gap-2
									"
								>
									{
										project.tags.map((tag) => (
											<span 
												key={`${project.id}-${tag}`} 
												className="
													rounded-md 
													bg-white 
													px-2 
													py-1 
													text-xs 
													text-slate-700
												"
											>
												{tag}
											</span>
										))
									}
								</div>
							</article>
						))
					)
				}
			</div>
		</section>
	);
}
