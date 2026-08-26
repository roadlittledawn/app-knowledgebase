import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;
    if (!bucket || !region) return [];

    return [
      {
        source: "/browse/:slug.md",
        destination: `https://${bucket}.s3.${region}.amazonaws.com/markdown/:slug.md`,
      },
    ];
  },
};

export default nextConfig;
