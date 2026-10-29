/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: 'cdn.local.austenstrine.dev' },
			{ protocol: 'https', hostname: 'cdn.austenstrine.dev' },
		],
	},
	async rewrites() {
		return [
			{
				source: '/cv.html',
				destination: '/cv',
			},
		];
	},
	async redirects() {
    return [
      {
        source: '/shop',
        destination: '/place-et-marque',
        permanent: true,
      },
      {
        source: '/shop/:path*',
        destination: '/place-et-marque/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
