#!/bin/bash

# Sleep Lamp Deployment Script

echo "🚀 Starting Sleep Lamp deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Build client
echo "🔨 Building client..."
cd client && npm run build && cd ..

echo "✅ Sleep Lamp deployment completed!"
echo "🚀 To start the application, run: npm start"