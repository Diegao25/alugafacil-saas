import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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
  poweredByHeader: false,
  reactStrictMode: true,
  // Desabilita geração de sourcemaps para economizar memória
  productionBrowserSourceMaps: false,
};

export default nextConfig;