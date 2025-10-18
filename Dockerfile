# 1. Use a slim Node.js base image
FROM node:22-slim

# 2. Install required system dependencies for Puppeteer (Chromium)
# This addresses the "libgobject-2.0.so.0: cannot open shared object file" error
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libgobject-2.0-0 \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxkbcommon0 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxshmfence6 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Set the working directory
WORKDIR /app

# 4. Copy package files and install dependencies
# This is necessary to use Docker build cache efficiently
COPY package*.json ./
RUN npm install

# 5. Copy the rest of your application code
COPY . .

# 6. Set the command to start your application
# Uses the 'start' script defined in your package.json
CMD [ "npm", "start" ]
