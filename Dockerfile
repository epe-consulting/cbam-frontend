# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /workspace

# Accept build argument for API base URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy package files first to leverage Docker layer caching
COPY my-react-app/package*.json ./
RUN npm ci

# Copy source files and build
COPY my-react-app/ .
RUN npm run build

# ---- Run stage ----
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built assets from build stage
COPY --from=build /workspace/dist .

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
