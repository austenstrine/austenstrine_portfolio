import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const ibmPlexSans = localFont({
	src: [
		{
			path: '../fonts/ibm-plex-sans/ibm-plex-sans-latin-400-normal.woff2',
			weight: '400',
			style: 'normal',
		},
		{
			path: '../fonts/ibm-plex-sans/ibm-plex-sans-latin-500-normal.woff2',
			weight: '500',
			style: 'normal',
		},
		{
			path: '../fonts/ibm-plex-sans/ibm-plex-sans-latin-600-normal.woff2',
			weight: '600',
			style: 'normal',
		},
		{
			path: '../fonts/ibm-plex-sans/ibm-plex-sans-latin-700-normal.woff2',
			weight: '700',
			style: 'normal',
		},
	],
	display: 'swap',
	adjustFontFallback: 'Arial',
	variable: '--font-ibm-plex-sans',
});

export const metadata: Metadata = {
	title: 'CRM · austenstrine',
	description: 'CRM',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			className={ibmPlexSans.variable}
			lang="en"
		>
			<body className="font-sans">
				{children}
			</body>
		</html>
	);
}
