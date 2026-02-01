FROM node:20-slim

WORKDIR /app

# Copy package files only — good cache
COPY package*.json ./

# Install ALL dependencies inside container (dev + prod)
RUN npm install

# Copy the rest of the backend code
COPY . .

CMD ["npm", "start"]
