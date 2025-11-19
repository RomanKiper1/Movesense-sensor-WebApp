# Dockerfile
FROM python:3.11-slim

# Optional: set working directory
WORKDIR /app

# Install system deps if needed (e.g. bluez)
RUN apt-get update && apt-get install -y \
    bluez \
    && rm -rf /var/lib/apt/lists/*

# Copy project files
COPY python-datalogger-tool/ ./python-datalogger-tool/
COPY CSV_WEB_WORKFLOW.md PROJECT_ARCHITECTURE.md ./
COPY index.html styles.css main.js ./web/

# Install Python deps
WORKDIR /app/python-datalogger-tool
RUN pip install --no-cache-dir -r requirements.txt

# Start a simple HTTP server to serve the web files
EXPOSE 8000
CMD ["python", "-m", "http.server", "8000"]