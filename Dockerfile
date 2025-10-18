# 1. Use a slim Node.js base image
FROM node:22-slim

# 2. Install required system dependencies for Puppeteer (Chromium)
# NOTE: libglib2.0-0 provides the missing libgobject-2.0.so.0 file.
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
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
    libxtst6 \
    libglib2.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Set the working directory
WORKDIR /app

# 4. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 5. Copy the rest of your application code
COPY . .

# 6. Set the command to start your application
CMD [ "npm", "start" ]
