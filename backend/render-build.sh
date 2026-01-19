#!/bin/bash
# Build script for Render deployment
# This runs before the start command

echo "🔧 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Build complete!"

