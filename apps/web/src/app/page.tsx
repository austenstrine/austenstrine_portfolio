import { AboutSection } from '../components/sections/AboutSection';
import { ContactSection } from '../components/sections/ContactSection';
import { HeroSection } from '../components/sections/HeroSection';
import { ProjectsSection } from '../components/sections/ProjectsSection';
import { SiteFooter } from '../components/sections/SiteFooter';
import { SkillsSection } from '../components/sections/SkillsSection';
import { getProjects } from '../lib/api';

export default async function Home() {
  const projects = await getProjects();

  return (
    <main className="main-grid min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <HeroSection />
        <AboutSection />
        <SkillsSection />
        <ProjectsSection projects={projects} />
        <ContactSection />
        <SiteFooter />
      </div>
    </main>
  );
}
