# FRONT

# Etapa 1: build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Etapa 2: usar Nginx para servir
FROM nginx:stable-alpine

# Elimina la config por defecto de Nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia el build de Vite (dist) al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia una config personalizada de Nginx si usas React Router
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
