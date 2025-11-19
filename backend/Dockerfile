# ===========================
# 1. Build Stage
# ===========================
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

# ===========================
# 2. Production Stage
# ===========================
FROM node:20-slim

WORKDIR /app

# Copy only node_modules + source
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY package*.json ./

EXPOSE 8081

CMD ["node", "src/index.js"]
