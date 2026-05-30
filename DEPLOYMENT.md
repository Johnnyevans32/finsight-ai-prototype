# 🐳 Finsight AI - Docker Deployment Guide

## Quick Start

```bash
# 1. Start deployment
./deploy.sh

# OR manually:
docker-compose up --build -d
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Admin**: http://localhost:8000/admin/

## Demo Credentials

- **Email**: `test2@example.com`
- **Password**: `testpassword123`

## Services Architecture

### 🎨 Frontend (Next.js)

- **Port**: 3000
- **Tech**: Next.js 14, TypeScript, Tailwind CSS
- **Features**: Responsive dashboard, AI chat interface, bank connections

### ⚙️ Backend (Django)

- **Port**: 8000
- **Tech**: Django REST Framework, Gunicorn, SQLite
- **Features**: AI financial analysis, Mono banking integration, transaction processing

### 🤖 AI Features

- **Engine**: DeepSeek V4 Flash API
- **Capabilities**:
  - Financial health scoring (0-100)
  - 6-month trend analysis
  - Risk assessment with 8+ indicators
  - Personalized recommendations
  - Natural language financial queries

## Container Details

### Frontend Container

```dockerfile
FROM node:18-alpine
# Multi-stage build for optimization
# Standalone Next.js output for production
EXPOSE 3000
```

### Backend Container

```dockerfile
FROM python:3.12-slim
# Gunicorn WSGI server
# Auto-migration on startup
EXPOSE 8000
```

**Setup**: Copy `backend/.env.example` to `backend/.env` and update with your API keys.

## Data Persistence

- SQLite database mounted as volume
- Demo data automatically seeded
- 50+ sample transactions included

## Network Configuration

- Services communicate via `finsight_network`
- Frontend connects to backend via internal networking
- External access via localhost ports

## Monitoring Commands

```bash
# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d
```

## Testing the Application

### 1. Bank Connection Flow

- Navigate to Settings → Banks
- Click "Connect Bank Account"
- Use Mono Connect demo flow

### 2. AI Financial Intelligence

- Go to "AI Intelligence" tab
- View comprehensive financial analysis
- Check health score, predictions, alerts

### 3. AI Assistant

- Use chat interface on dashboard
- Ask questions like "What did I spend this month?"
- Get personalized financial advice

### 4. Dashboard Analytics

- View real-time balance: ₦100,000
- Monthly spending: ₦1,266.73 (accurate calculation)
- Recent transactions with categories

## API Endpoints for Testing

```bash
# Health check
curl http://localhost:8000/api/

# AI Financial Intelligence
curl -H "Cookie: sessionid=..." http://localhost:8000/api/ai/financial-intelligence/

# Get transactions
curl -H "Cookie: sessionid=..." http://localhost:8000/api/transactions/
```
