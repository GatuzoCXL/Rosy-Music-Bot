FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./
RUN npm ci --omit=dev

COPY index.js ./
COPY utils/ ./utils/
COPY commands/ ./commands/
COPY handlers/ ./handlers/
COPY events/ ./events/
COPY scripts/ ./scripts/

ENV NODE_ENV=production

CMD ["node", "index.js"]