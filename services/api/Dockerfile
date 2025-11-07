FROM node:22-alpine

WORKDIR /app

# Copy root workspace package.json first for dependency resolution
COPY package.json ./

# Copy API service package files
COPY services/api/package*.json ./services/api/

# Copy shared packages
COPY packages ./packages/

# Install all dependencies (workspace aware)
RUN npm install --workspace=services/api

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy API source code
COPY services/api ./services/api/

# Set working directory to API service
WORKDIR /app/services/api

# Don't hardcode env values, app will read from .env
EXPOSE 3000

CMD ["npm", "start"]
