import { AboutSection } from '../components/sections/AboutSection';
import { ContactSection } from '../components/sections/ContactSection';
import type { CurrentHighlightBody } from '../components/sections/CurrentHighlightCard';
import { FeaturedBuildSection } from '../components/sections/FeaturedBuildSection';
import { HeroSection } from '../components/sections/HeroSection';
import { HighlightSectionWrapper } from '../components/sections/HighlightSectionWrapper';
import { SiteFooter } from '../components/sections/SiteFooter';
import { SkillsSection } from '../components/sections/SkillsSection';
import { features } from '../lib/highlightTour';

const sharedStackItems = ['Next.js', 'NestJS', 'Prisma', 'Redis', 'OpenSearch', 'Docker'];

const sharedActions = [
	{
		label: 'Frontend code',
		href: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web',
		variant: 'solid' as const,
	},
	{
		label: 'API code',
		href: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/api',
		variant: 'outline' as const,
	},
];

const highlightBodies = Object.fromEntries(
	features.map((feature) => [
		feature.id,
		{
			title: feature.title,
			detail: feature.detail,
			stackTitle: 'Stack and direction',
			stackItems: sharedStackItems,
			notes: feature.notes,
			actions: [
				{
					label: feature.codeLabel,
					href: feature.codeHref,
					variant: 'solid' as const,
				},
				...sharedActions,
			],
		},
	]),
) as Record<string, CurrentHighlightBody>;

export default function Home() {
	return (
		<main className="main-grid min-h-screen">
			<div
				className="
					mx-auto
					flex
					w-full
					max-w-6xl
					flex-col
					gap-6
					px-6
					py-10
				"
			>
				<HeroSection />
				<HighlightSectionWrapper
					featureIds={['about-layout']}
					bodyByFeatureId={highlightBodies}
				>
					<AboutSection />
				</HighlightSectionWrapper>
				<HighlightSectionWrapper
					featureIds={['skills-rhythm']}
					bodyByFeatureId={highlightBodies}
				>
					<SkillsSection />
				</HighlightSectionWrapper>
				<HighlightSectionWrapper
					featureIds={['full-stack-foundation']}
					bodyByFeatureId={highlightBodies}
				>
					<FeaturedBuildSection />
				</HighlightSectionWrapper>
				<HighlightSectionWrapper
					featureIds={['contact-ux', 'cv-flow']}
					bodyByFeatureId={highlightBodies}
				>
					<ContactSection />
				</HighlightSectionWrapper>
				<SiteFooter />
			</div>
		</main>
	);
}
