# Stage 1: Build Vue app
FROM node:20-alpine AS build-stage
WORKDIR /app
ARG VITE_TILE_ATTRIBUTION="Map data: configured provider"
ENV VITE_TILE_ATTRIBUTION=${VITE_TILE_ATTRIBUTION}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
