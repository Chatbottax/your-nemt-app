/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    PLACES_BROWSER_KEY: process.env.PLACES_BROWSER_KEY,
    MAPS_JS_BROWSER_KEY: process.env.MAPS_JS_BROWSER_KEY,
  },
};

export default nextConfig;

