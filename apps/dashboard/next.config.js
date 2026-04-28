/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@soccer-card-radar/shared",
    "@soccer-card-radar/db",
    "@soccer-card-radar/ebay",
    "@soccer-card-radar/mercari-us",
  ],
};

module.exports = nextConfig;
