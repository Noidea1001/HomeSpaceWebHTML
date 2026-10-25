# Production-ready lightweight Nginx container for HomeSpace
FROM nginx:1.27-alpine

LABEL maintainer="HomeSpace DevOps Team"
LABEL description="Production container for HomeSpace Real Estate Web Platform"

# Remove default Nginx virtual host config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom hardened Nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy static website assets to web root
COPY . /usr/share/nginx/html/

# Clean up non-web files inside container
RUN rm -rf /usr/share/nginx/html/nginx \
    && rm -rf /usr/share/nginx/html/Dockerfile \
    && rm -rf /usr/share/nginx/html/docker-compose.yml \
    && rm -rf /usr/share/nginx/html/.git \
    && rm -rf /usr/share/nginx/html/.github

# Expose standard web port
EXPOSE 80

# Built-in container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
