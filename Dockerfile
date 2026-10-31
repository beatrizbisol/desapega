FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data UPLOADS_DIR=/data/uploads
COPY --from=build /app/package.json /app/next.config.ts ./
COPY --from=build /app/node_modules ./node_modules
# why: next/image writes its cache under .next/cache; owned by root, the node
# user cannot create it and every request re-optimizes and refetches from R2.
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/data/items.json ./seed/items.json
USER node
EXPOSE 43127
CMD ["npx", "next", "start", "--port", "43127", "--hostname", "0.0.0.0"]
