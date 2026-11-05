import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { BackendDownBanner } from '../components/BackendDownBanner';
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
	icons: {
		icon: [
			{
				url: '/favicon.ico',
				sizes: '48x48',
			},
			{
				url: '/favicon.svg',
				type: 'image/svg+xml',
			},
			{
				url: '/favicon-32.png',
				sizes: '32x32',
				type: 'image/png',
			},
			{
				url: '/icon-192.png',
				sizes: '192x192',
				type: 'image/png',
			},
			{
				url: '/icon-512.png',
				sizes: '512x512',
				type: 'image/png',
			},
		],
		apple: [
			{
				url: '/apple-touch-icon.png',
				sizes: '180x180',
			},
		],
	},
};

export const viewport: Viewport = {
	themeColor: '#1b263b',
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
				<BackendDownBanner />
				{children}
			</body>
		</html>
	);
}
