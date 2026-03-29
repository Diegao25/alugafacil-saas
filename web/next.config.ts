import type { NextConfig } from "next";

const nextConfig = {

  // Redução agressiva de consumo de memória para build (Next.js 15+ / v16)
  experimental: {
    workerThreads: false,
    cpus: 1,
    // Garante que o build não tente paralelar excessivamente
    parallelServerBuildTraces: false,
    parallelServerCompiles: false,
    // Otimiza a importação de bibliotecas de ícones para evitar carregar tudo na RAM
    optimizePackageImports: ['lucide-react', 'react-big-calendar', 'date-fns', 'axios'],
  },
  // Desativa verificação de tipos no build (economiza muita RAM)
  typescript: {
    ignoreBuildErrors: true, 
  },
  images: {
    // Re-habilitando otimização para domínios comuns
    remotePatterns: [
      { protocol: 'https', hostname: '**.up.railway.app' },
      { protocol: 'https', hostname: '**.alugafacil.net.br' },
      { protocol: 'https', hostname: '**.stripe.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
  // Desabilita geração de sourcemaps para economizar memória
  productionBrowserSourceMaps: false,
  // Habilita o modo standalone para otimização de build em containers (Railway/Docker)
  output: 'standalone',
} satisfies import("next").NextConfig;

export default nextConfig;
