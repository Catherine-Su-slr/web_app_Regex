# Stage 1 — Build React app
FROM node:18-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --silent
COPY . .
RUN npm run build

# Stage 2 — Serve with nginx
FROM nginx:alpine

RUN apk add --no-cache gettext

COPY --from=build /app/build /usr/share/nginx/html

# nginx config: proxy /api/* to backend, serve React for everything else
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["/bin/sh", "-c", "envsubst '$BACKEND_URL' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
