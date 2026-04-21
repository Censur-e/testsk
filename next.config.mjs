/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure the Lua script is shipped with the serverless route that reads it.
  outputFileTracingIncludes: {
    "/api/roblox-script": ["./roblox/**/*"],
  },
}

export default nextConfig
