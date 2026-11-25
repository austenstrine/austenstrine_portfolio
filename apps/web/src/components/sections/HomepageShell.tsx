import { AboutSection } from './AboutSection';
import { ContactSection } from './ContactSection';
import { ExperienceSection } from './ExperienceSection';
import { FeaturedBuildSection } from './FeaturedBuildSection';
import { HeroSection } from './HeroSection';
import { SiteFooter } from './SiteFooter';
import { SkillsSection } from './SkillsSection';
import {
	HomepageTailorProvider,
	type HomepageTailorConfig,
} from '../../lib/homepage-tailor';

/**
 * Single homepage composition. `/` = default tailor; `/for/[slug]` = overlay.
 */
export function HomepageShell({
	tailor,
}: {
	tailor?: Partial<HomepageTailorConfig> | null;
} = {}) {
	return (
		<HomepageTailorProvider tailor={tailor}>
			<main className="main-grid min-h-screen">
				<div
					className="
						mx-auto
						flex
						w-full
						max-w-6xl
						flex-col
						gap-section
						px-0
						pt-0
						pb-0
						sm:px-gutter
						sm:pt-10
						sm:pb-10
					"
				>
					<HeroSection />
					<ExperienceSection />
					<AboutSection />
					<SkillsSection />
					<FeaturedBuildSection />
					<ContactSection />
					<SiteFooter />
				</div>
			</main>
		</HomepageTailorProvider>
	);
}
