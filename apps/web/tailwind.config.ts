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
        signal: '#e76f51',
        frost: '#e0e1dd',
      },
    },
  },
  plugins: [],
};

export default config;
