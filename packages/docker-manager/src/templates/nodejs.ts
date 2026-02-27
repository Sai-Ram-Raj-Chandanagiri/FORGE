export function nodejsDockerfile(framework?: string, port?: number): string {
  const exposedPort = port || 3000;

  if (framework === "nextjs") {
    return `FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \\
  if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \\
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \\
  elif [ -f package-lock.json ]; then npm ci; \\
  else npm install; \\
  fi

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN \\
  if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm run build; \\
  elif [ -f yarn.lock ]; then yarn build; \\
  else npm run build; \\
  fi

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE ${exposedPort}
ENV PORT=${exposedPort}
CMD ["node", "server.js"]`;
  }

  // Generic Node.js (Express, Fastify, etc.)
  return `FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \\
  if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile; \\
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \\
  elif [ -f package-lock.json ]; then npm ci; \\
  else npm install; \\
  fi
COPY . .
RUN npm run build --if-present
EXPOSE ${exposedPort}
CMD ["npm", "start"]`;
}
