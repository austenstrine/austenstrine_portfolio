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
        // viewport-element scale (CSS vars; +1 step vs flex-sheet defaults)
        ve: 'var(--viewport-element)',
        've-lg': 'var(--viewport-element--large)',
        've-sm': 'var(--viewport-element--small)',
        've-tiny': 'var(--viewport-element--tiny)',
        've-0.25': 'calc(0.25 * var(--viewport-element))',
        've-0.375': 'calc(0.375 * var(--viewport-element))',
        've-0.5': 'calc(0.5 * var(--viewport-element))',
        've-0.625': 'calc(0.625 * var(--viewport-element))',
        've-0.75': 'calc(0.75 * var(--viewport-element))',
        've-1.25': 'calc(1.25 * var(--viewport-element))',
        've-1.5': 'calc(1.5 * var(--viewport-element))',
        've-2': 'calc(2 * var(--viewport-element))',
        've-2.5': 'calc(2.5 * var(--viewport-element))',
        've-3': 'calc(3 * var(--viewport-element))',
        've-4': 'calc(4 * var(--viewport-element))',
      },
    },
  },
  plugins: [],
};

export default config;
