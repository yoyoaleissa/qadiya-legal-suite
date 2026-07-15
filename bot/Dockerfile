FROM node:22-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-noto-color-emoji \
    fonts-noto-cjk \
    fonts-noto \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source code
COPY . .

# Create PDF output directory
RUN mkdir -p /tmp/pdfs

# Start the bot
CMD ["node", "index.js"]
