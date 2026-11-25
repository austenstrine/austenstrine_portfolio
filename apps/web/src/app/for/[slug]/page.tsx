import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomepageShell } from '../../../components/sections/HomepageShell';
import {
	FOR_TARGETS,
	getForTarget,
	listForTargetSlugs,
} from '../../../data/for-targets';

type ForPageProps = {
	params: Promise<{
		slug: string;
	}>;
};

export function generateStaticParams() {
	return listForTargetSlugs().map((slug) => ({
		slug,
	}));
}

export async function generateMetadata({
	params,
}: ForPageProps): Promise<Metadata> {
	const { slug } = await params;
	const target = FOR_TARGETS[slug];
	if(!target) {
		return {
			title: 'Not found',
		};
	}
	// Layout title template already appends ` · Austen Strine`.
	return {
		title: target.headline,
		description: target.blurb,
		alternates: {
			canonical: `/for/${slug}`,
		},
		robots: {
			index: false,
			follow: true,
		},
	};
}

/**
 * Same homepage shell as `/`, with tailor overlay for the slug.
 * Unknown slug → 404 (not a silent untailored home).
 */
export default async function ForTargetPage({
	params,
}: ForPageProps) {
	const { slug } = await params;
	const tailor = getForTarget(slug);
	if(!tailor) {
		notFound();
	}
	return (
		<HomepageShell tailor={tailor} />
	);
}
