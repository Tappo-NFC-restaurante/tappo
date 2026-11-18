# ==========================================
# Estágio 1: Builder
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instala ferramentas necessárias
RUN apk add --no-cache openssl

# Copia manifests dos workspaces
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Instala todas as dependências do monorepo
RUN npm install

# Copia todo o código-fonte
COPY . .

# Gera o Prisma Client
RUN cd apps/api && npx prisma generate

# Compila o frontend React (apps/web) gerando apps/web/dist
RUN cd apps/web && npm run build

# Compila o backend TypeScript (apps/api) gerando apps/api/dist
RUN cd apps/api && npm run build

# ==========================================
# Estágio 2: Runner de Produção
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3001

# Copia arquivos compilados e dependências
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/api

EXPOSE 3001

# Na inicialização: aplica o schema no Postgres, roda o seed inicial se necessário e inicia a aplicação
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx tsx prisma/seed.ts && node dist/server.js"]
