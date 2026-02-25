# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .

# Build-time env (REACT_APP_* vars are baked into the build)
ARG REACT_APP_BACKEND_URL=http://localhost:5000
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN npm run build

# Production stage - serve static files with nginx
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx config: proxy /api to backend, SPA routing for client-side routes
# client_max_body_size 100m allows large EML zip uploads (1000+ files)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  client_max_body_size 100m; \
  location /api { \
    client_max_body_size 100m; \
    proxy_pass http://backend:5000; \
    proxy_http_version 1.1; \
    proxy_set_header Host $host; \
    proxy_set_header X-Real-IP $remote_addr; \
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    proxy_set_header X-Forwarded-Proto $scheme; \
    proxy_connect_timeout 300; \
    proxy_send_timeout 300; \
    proxy_read_timeout 300; \
  } \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
