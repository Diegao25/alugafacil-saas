# Optimized Dockerfile for Next.js 15+ 
# Estágio de dependências
FROM node:20.18.1-slim AS deps
RUN apt-get update && apt-get install -y libc6 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copiar apenas os arquivos de manifesto da pasta web
# Este Dockerfile assume que o contexto de build é a pasta /web
COPY package.json package-lock.json* ./
RUN npm ci

# Estágio de build
FROM node:20.18.1-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de ambiente para controle de memória
ENV NEXT_TELEMETRY_DISABLED 1
# Limite recomendável para Railway com 4GB+ 
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Desabilitar source maps no build para economizar RAM
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# Estágio de Runner
FROM node:20.18.1-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Pasta public
COPY --from=builder /app/public ./public

# Modo Standalone: copia apenas o necessário para rodar
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# O server.js no standalone mode fica na raiz do output
CMD ["node", "server.js"]
