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
        ink: '#0d1b2a',
        sky: '#1b263b',
        asgreen: '#257257',
        signal: '#e76f51',
        frost: '#fafaf8',
        // Product image void / placeholder plane (catalog cards + detail)
        canvas: '#d8d9d4',
      },
      spacing: {
        gutter: 'var(--gutter)',
        inset: 'var(--inset)',
        section: 'var(--section-gap)',
      },
    },
  },
  plugins: [],
};

export default config;
