import { AboutSection } from '../components/sections/AboutSection';
import { ContactSection } from '../components/sections/ContactSection';
import { ExperienceSection } from '../components/sections/ExperienceSection';
import { FeaturedBuildSection } from '../components/sections/FeaturedBuildSection';
import { HeroSection } from '../components/sections/HeroSection';
import { SiteFooter } from '../components/sections/SiteFooter';
import { SkillsSection } from '../components/sections/SkillsSection';

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
	);
}
