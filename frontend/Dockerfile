FROM node:26-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_UMAMI_SCRIPT_URL
ARG VITE_UMAMI_WEBSITE_ID
ARG VITE_GA_MEASUREMENT_ID
ENV VITE_UMAMI_SCRIPT_URL=$VITE_UMAMI_SCRIPT_URL
ENV VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID
ENV VITE_GA_MEASUREMENT_ID=$VITE_GA_MEASUREMENT_ID
RUN npm run build

FROM nginx:1.28-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Rendered to /etc/nginx/conf.d/default.conf at start-up; only the variables below are substituted,
# so nginx's own $uri, $host, ... stay untouched.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER="^CSP_"
# Extra CSP sources for optional analytics, e.g.
#   CSP_SCRIPT_SRC_EXTRA="https://www.googletagmanager.com https://analytics.example.com"
#   CSP_CONNECT_SRC_EXTRA="https://*.google-analytics.com https://analytics.example.com"
ENV CSP_SCRIPT_SRC_EXTRA=""
ENV CSP_CONNECT_SRC_EXTRA=""
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
