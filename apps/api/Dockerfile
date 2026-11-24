FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w packages/contracts -w apps/api --include-workspace-root
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN npm run build -w packages/contracts && npm run build -w apps/api

FROM node:24-alpine AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev -w packages/contracts -w apps/api

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-deps /app ./
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
