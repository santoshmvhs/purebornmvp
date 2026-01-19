FROM python:3.11-slim

# Coolify uses PORT environment variable (defaults to 8000)
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make startup script executable
RUN chmod +x /app/docker-entrypoint.sh

# Expose port (Coolify will map this dynamically)
EXPOSE 8000

# Use startup script for migrations and server start
ENTRYPOINT ["/app/docker-entrypoint.sh"]

