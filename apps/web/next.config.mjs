/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
