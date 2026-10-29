/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	output: 'export',
	images: {
		unoptimized: true,
	},
	async rewrites() {
		return [
			{
				source: '/cv.html',
				destination: '/cv',
			},
		];
	},
};

export default nextConfig;
