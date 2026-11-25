import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HomepageShell } from '../../../components/sections/HomepageShell';
import {
	FOR_TARGETS,
	getForTarget,
	listForTargetSlugs,
} from '../../../data/for-targets';
import { SITE_NAME } from '../../../lib/site';

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
	return {
		title: `${target.headline} · ${SITE_NAME}`,
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
