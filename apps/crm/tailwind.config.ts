import type { Config } from 'tailwindcss';

const config: Config = {
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				panel: '#121820',
				rail: '#0b1017',
				line: '#243041',
				mist: '#c8d0db',
				glow: '#3d9b7a',
				warn: '#d97757',
			},
			fontFamily: {
				sans: [
					'var(--font-ibm-plex-sans)',
					'ui-sans-serif',
					'system-ui',
					'sans-serif',
				],
				display: [
					'var(--font-ibm-plex-sans)',
					'ui-sans-serif',
					'system-ui',
					'sans-serif',
				],
			},
		},
	},
	plugins: [],
};

export default config;
