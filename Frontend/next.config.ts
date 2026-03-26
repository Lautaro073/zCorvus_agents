import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true
  },
  serverExternalPackages: ["libsql", "@libsql/client"],
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);