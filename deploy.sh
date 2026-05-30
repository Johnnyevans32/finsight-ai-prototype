#!/bin/bash

echo "🚀 Deploying Finsight AI Platform"
echo "=================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Build and start services
echo "🔧 Building and starting services..."
docker-compose up --build -d

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
sleep 10

# Check if services are running
echo "✅ Checking service status..."
docker-compose ps

echo ""
echo "🎉 Deployment Complete!"
echo "========================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo ""
echo "Demo Login:"
echo "Email:    test2@example.com"
echo "Password: testpassword123"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop:      docker-compose down"