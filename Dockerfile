FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY build.mjs ai-service.mjs ./
COPY src ./src
COPY public ./public
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S hisobkor && adduser -S -G hisobkor hisobkor && mkdir -p /var/lib/hisobkor && chown hisobkor:hisobkor /var/lib/hisobkor
COPY --from=build --chown=hisobkor:hisobkor /app/node_modules ./node_modules
COPY --from=build --chown=hisobkor:hisobkor /app/public ./public
COPY --chown=hisobkor:hisobkor server.mjs server-config.mjs server-storage.mjs ai-service.mjs package.json ./
USER hisobkor
EXPOSE 4173
VOLUME ["/var/lib/hisobkor"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:4173/healthz >/dev/null || exit 1
CMD ["node", "server.mjs"]
