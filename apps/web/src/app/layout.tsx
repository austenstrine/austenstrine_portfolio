import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BackendDownBanner } from '../components/BackendDownBanner';
import './globals.css';

export const metadata: Metadata = {
	title: 'Austen Strine Portfolio',
	description: 'Portfolio app with Next.js frontend and NestJS backend',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				<BackendDownBanner />
				{children}
			</body>
		</html>
	);
}
