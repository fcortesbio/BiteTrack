# Use the official Node.js image as the base image
FROM node:22-alpine

WORKDIR /app
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set an environment variable for the Express.js server
ENV PORT=3000

# Expose port 3000 to the host machine
EXPOSE 3000

# command to run the application
CMD ["npm", "start"]
