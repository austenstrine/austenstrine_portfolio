import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JsonLd } from '../components/JsonLd';
import {
	SITE_DESCRIPTION,
	SITE_NAME,
	SITE_OG_IMAGE,
	SITE_TITLE,
	SITE_URL,
	personJsonLd,
} from '../lib/site';
import './globals.css';

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: SITE_TITLE,
		template: `%s · ${SITE_NAME}`,
	},
	description: SITE_DESCRIPTION,
	alternates: {
		canonical: '/',
	},
	openGraph: {
		type: 'website',
		url: SITE_URL,
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		siteName: SITE_NAME,
		locale: 'en_US',
		images: [
			{
				url: SITE_OG_IMAGE,
				alt: SITE_NAME,
			},
		],
	},
	twitter: {
		card: 'summary',
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		images: [SITE_OG_IMAGE],
	},
	robots: {
		index: true,
		follow: true,
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				<JsonLd
					id="person-jsonld"
					data={personJsonLd}
				/>
				{children}
			</body>
		</html>
	);
}
