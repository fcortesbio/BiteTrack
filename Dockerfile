FROM node:22-alpine

WORKDIR /app
COPY package*.json ./

RUN npm install

COPY . .

# Don’t hardcode env values, app will read from .env
EXPOSE 3000

CMD ["npm", "start"]
