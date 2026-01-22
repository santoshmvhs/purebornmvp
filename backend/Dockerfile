# Build stage (optional, for future use)
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim AS production

# PORT environment variable (defaults to 8000)
# Dokploy/Coolify will set this dynamically
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Make startup script executable
RUN chmod +x /app/docker-entrypoint.sh

# Expose port (will be mapped by Dokploy/Coolify)
EXPOSE 8000

# Use startup script for migrations and server start
ENTRYPOINT ["/app/docker-entrypoint.sh"]

