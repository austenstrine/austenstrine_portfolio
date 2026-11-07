import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const ibmPlexSans = IBM_Plex_Sans({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
	display: 'swap',
	adjustFontFallback: true,
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
