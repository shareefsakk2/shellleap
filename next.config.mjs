/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Ensure that we don't try to use server-side features that aren't available in static export
  trailingSlash: true,
};

export default nextConfig;
