# BACK
# Imagen base
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --only=production

# Copiar el resto del proyecto
COPY . .

# Expone el puerto (ajusta si usas otro en server.js)
EXPOSE 3001

# Comando para iniciar la API
CMD ["node", "server.js"]
