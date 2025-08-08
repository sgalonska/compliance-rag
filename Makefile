# Compliance RAG System Makefile

.PHONY: help install dev build start stop logs clean test

# Default target
help:
	@echo "Available commands:"
	@echo "  install     - Install dependencies"
	@echo "  dev         - Start development environment"
	@echo "  build       - Build Docker images"
	@echo "  start       - Start production environment"
	@echo "  stop        - Stop all services"
	@echo "  logs        - View logs"
	@echo "  clean       - Clean up containers and volumes"
	@echo "  test        - Run tests"
	@echo "  setup-env   - Setup environment files"

# Development
install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

dev:
	@echo "Starting development environment..."
	docker-compose up -d postgres redis
	@echo "Backend will be available at http://localhost:8000"
	@echo "Frontend will be available at http://localhost:3000"
	@echo "Run 'make dev-backend' and 'make dev-frontend' in separate terminals"

dev-backend:
	@echo "Starting backend in development mode..."
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "Starting frontend in development mode..."
	cd frontend && npm run dev

# Production
build:
	@echo "Building Docker images..."
	docker-compose build

start:
	@echo "Starting production environment..."
	docker-compose -f docker-compose.prod.yml up -d

stop:
	@echo "Stopping all services..."
	docker-compose down
	docker-compose -f docker-compose.prod.yml down

# Utilities
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

clean:
	@echo "Cleaning up containers and volumes..."
	docker-compose down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f

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

# Setup
setup-env:
	@echo "Setting up environment files..."
	cp backend/.env.example backend/.env
	cp .env.example .env.prod
	@echo "Please edit backend/.env and .env.prod with your configuration"

# Health checks
health:
	@echo "Checking service health..."
	curl -f http://localhost:8000/health && echo "✅ Backend healthy"
	curl -f http://localhost:3000 && echo "✅ Frontend healthy"

# Backup
backup:
	@echo "Creating database backup..."
	docker-compose exec postgres pg_dump -U postgres compliance_rag > backup_$(shell date +%Y%m%d_%H%M%S).sql

restore:
	@echo "Restoring database backup..."
	@read -p "Enter backup file name: " file; \
	docker-compose exec -T postgres psql -U postgres compliance_rag < $$file