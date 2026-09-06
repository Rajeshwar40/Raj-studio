# syntax=docker/dockerfile:1.7
# Multi-stage build: compile the Vite bundle, then serve it with Nginx.
# The backend is a separate container/service — configure VITE_API_URL to point at it.

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Backend URL is baked into the bundle at build time (Vite convention).
# Override at build time:  docker build --build-arg VITE_API_URL=... .
ARG VITE_API_URL=http://127.0.0.1:8001
ARG VITE_API_KEY=
ARG VITE_REPO_URL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_REPO_URL=$VITE_REPO_URL

RUN npm run build

# ---- Runtime ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
