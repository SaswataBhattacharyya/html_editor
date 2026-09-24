FROM node:22-bookworm-slim

WORKDIR /app

# The browser clone worker is Python/Playwright based. Keep it in the same
# image so Docker mode has the same rendered-capture capability as local mode.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip chromium ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m pip install --break-system-packages --no-cache-dir playwright

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

# PinePaper is a separate MCP process. Install its runtime dependencies in a
# dedicated directory and use the already-built dist/ artifact from the repo.
RUN mkdir -p /opt/pinepaper
COPY mcp-server/package*.json /opt/pinepaper/
RUN cd /opt/pinepaper && npm ci --include=dev --ignore-scripts
COPY mcp-server/dist /opt/pinepaper/dist

ENV NODE_ENV=development
ENV PORT=3000
ENV HTML_EDITOR_CHROMIUM_PATH=/usr/bin/chromium
ENV PINEPAPER_ROOT=/opt/pinepaper
ENV OLLAMA_BASE_URL=http://host.docker.internal:11434

EXPOSE 3000

CMD ["node", "server.mjs"]
