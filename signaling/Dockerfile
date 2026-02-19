FROM node:18-alpine

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./

# Install dependencies (production only)
# Install dependencies (safer than ci if lockfile is missing)
RUN npm install --omit=dev

# Debug: Check if node_modules exists
RUN ls -la node_modules

# Copy server code
COPY server.js .

# Expose the port
EXPOSE 3000

# Start command
CMD ["node", "server.js"]
