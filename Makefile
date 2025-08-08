# Compliance RAG System Makefile

.PHONY: help install dev build start stop logs clean test

# Default target
help:
	@echo "🏛️  Compliance RAG System - Local Docker Deployment"
	@echo ""
	@echo "📋 Setup Commands:"
	@echo "  setup-env   - Setup environment files"
	@echo "  build       - Build Docker images"
	@echo ""
	@echo "🚀 Development Commands:"
	@echo "  dev         - Start development environment (recommended)"
	@echo "  start       - Start production environment"
	@echo "  stop        - Stop all services"
	@echo "  restart     - Restart all services"
	@echo ""
	@echo "📊 Monitoring Commands:"
	@echo "  logs        - View all logs"
	@echo "  logs-backend - View backend logs only"
	@echo "  logs-frontend - View frontend logs only"
	@echo "  health      - Check service health"
	@echo ""
	@echo "🛠️  Utility Commands:"
	@echo "  clean       - Clean up containers and volumes"
	@echo "  reset       - Complete reset (clean + rebuild)"
	@echo "  shell-backend - Open backend container shell"
	@echo "  shell-db    - Open database shell"

# Setup
setup-env:
	@echo "🔧 Setting up environment files..."
	@cp backend/.env.example backend/.env || echo "backend/.env already exists"
	@echo ""
	@echo "📝 Configuration completed! This system runs 100% locally:"
	@echo "   ✅ No API keys required"
	@echo "   ✅ No external services needed" 
	@echo "   ✅ Complete privacy and control"
	@echo ""
	@echo "🔑 Only edit SECRET_KEY in backend/.env (generate a secure 32+ character string)"
	@echo ""
	@echo "💡 Next steps:"
	@echo "   1. make dev              # Start all services"
	@echo "   2. ./scripts/setup-models.sh  # Download local AI models"

# Development
dev:
	@echo "🚀 Starting development environment..."
	@echo "This will start PostgreSQL, Redis, and build your application"
	docker-compose up -d --build
	@echo ""
	@echo "✅ Services starting up..."
	@echo "🌐 Frontend: http://localhost:3000"
	@echo "🔗 Backend API: http://localhost:8000"
	@echo "📖 API Docs: http://localhost:8000/docs"
	@echo ""
	@echo "📊 Check status: make logs"
	@echo "🛑 Stop services: make stop"

build:
	@echo "🔨 Building Docker images..."
	docker-compose build

start:
	@echo "🚀 Starting all services..."
	docker-compose up -d

restart:
	@echo "🔄 Restarting all services..."
	docker-compose restart

stop:
	@echo "🛑 Stopping all services..."
	docker-compose down

# Monitoring
logs:
	@echo "📊 Viewing all service logs (Ctrl+C to exit)..."
	docker-compose logs -f

logs-backend:
	@echo "📊 Viewing backend logs (Ctrl+C to exit)..."
	docker-compose logs -f backend

logs-frontend:
	@echo "📊 Viewing frontend logs (Ctrl+C to exit)..."
	docker-compose logs -f frontend

health:
	@echo "🏥 Checking service health..."
	@echo "Backend API:"
	@curl -s http://localhost:8000/health | grep -o '"status":"[^"]*"' || echo "❌ Backend not responding"
	@echo ""
	@echo "Frontend:"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend responding" || echo "❌ Frontend not responding"
	@echo ""
	@echo "Database:"
	@docker-compose exec -T postgres pg_isready -U postgres > /dev/null && echo "✅ Database responding" || echo "❌ Database not responding"

# Utilities
shell-backend:
	@echo "🐚 Opening backend container shell..."
	docker-compose exec backend bash

shell-db:
	@echo "🐚 Opening database shell..."
	docker-compose exec postgres psql -U postgres -d compliance_rag

clean:
	@echo "🧹 Cleaning up containers and volumes..."
	docker-compose down -v
	docker system prune -f
	@echo "✅ Cleanup complete"

reset:
	@echo "🔄 Complete reset (clean + rebuild)..."
	$(MAKE) clean
	$(MAKE) build
	@echo "✅ Reset complete - run 'make dev' to start"

# Database
db-migrate:
	@echo "Running database migrations..."
	docker-compose exec backend alembic upgrade head

db-reset:
	@echo "Resetting database..."
	docker-compose down postgres
	docker volume rm qdrant-compliance-rag_postgres_data
	docker-compose up -d postgres
	$(MAKE) db-migrate

# Testing
test:
	@echo "Running backend tests..."
	cd backend && python -m pytest
	@echo "Running frontend tests..."
	cd frontend && npm test

test-backend:
	cd backend && python -m pytest

test-frontend:
	cd frontend && npm test


# Backup
backup:
	@echo "Creating database backup..."
	docker-compose exec postgres pg_dump -U postgres compliance_rag > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore:
	@echo "Restoring database backup..."
	@read -p "Enter backup file name: " file; \
	docker-compose exec -T postgres psql -U postgres compliance_rag < $$file