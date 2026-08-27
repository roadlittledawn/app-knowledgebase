import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Works around a known next-mdx-remote + Turbopack incompatibility where
  // MDXRemote's own hooks crash with "Cannot read properties of null
  // (reading 'useState')" unless the package is transpiled by Next itself.
  transpilePackages: ["next-mdx-remote"],
  async rewrites() {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    if (!bucket) return [];
    // Match the default region used by getS3Client()/uploadMarkdownToS3 in src/lib/s3/client.ts
    const region = process.env.AWS_REGION || "us-east-1";

    return [
      {
        source: "/browse/:slug.md",
        destination: `https://${bucket}.s3.${region}.amazonaws.com/markdown/:slug.md`,
      },
    ];
  },
};

export default nextConfig;
