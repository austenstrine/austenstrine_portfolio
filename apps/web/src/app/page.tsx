import { AboutSection } from '../components/sections/AboutSection';
import { ContactSection } from '../components/sections/ContactSection';
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
					px-6
					py-10
				"
			>
				<HeroSection />
				<AboutSection />
				<SkillsSection />
				<FeaturedBuildSection />
				<ContactSection />
				<SiteFooter />
			</div>
		</main>
	);
}
