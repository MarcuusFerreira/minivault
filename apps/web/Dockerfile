FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json packages/contracts/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w packages/contracts -w apps/web --include-workspace-root
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN npm run build -w packages/contracts && npm run build -w apps/web

FROM nginxinc/nginx-unprivileged:alpine
COPY infrastructure/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY infrastructure/docker/proxy.inc /etc/nginx/conf.d/proxy.inc
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
