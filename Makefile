# Smart EDMS — Makefile
#
# Common operations for development, testing, and deployment.
# Spec ref: §23 (DevOps and Deployment), §24 (Testing).
#
# Usage:
#   make help              — show all available commands
#   make install           — pnpm install
#   make dev               — start dev infrastructure + all apps
#   make build             — build all packages + apps
#   make test              — run all tests
#   make typecheck         — typecheck everything
#   make db-setup          — generate Prisma clients + run migrations + seed
#   make docker-dev-up     — start dev infrastructure (postgres, redis, minio)
#   make docker-dev-down   — stop dev infrastructure
#   make docker-prod-up    — start full production stack
#   make docker-prod-down  — stop full production stack
#   make clean             — remove build artifacts + node_modules
#   make i18n-check        — validate i18n keys across all locales
#   make key-generate      — generate license signing keypair
#   make e2e               — run Playwright E2E tests (requires dev stack running)

.PHONY: help install dev build test typecheck lint format db-setup db-reset \
        docker-dev-up docker-dev-down docker-prod-up docker-prod-down \
        clean i18n-check i18n-extract key-generate e2e e2e-ui e2e-report \
        opensearch-init prisma-studio prisma-migrate prisma-migrate-deploy

# Default target
.DEFAULT_GOAL := help

# Colors
COLOR_RESET = \033[0m
COLOR_BOLD  = \033[1m
COLOR_BLUE  = \033[34m
COLOR_GREEN = \033[32m
COLOR_YELLOW = \033[33m

##@ Help

help: ## Show this help message
	@echo "$(COLOR_BOLD)Smart EDMS — Makefile$(COLOR_RESET)"
	@echo ""
	@echo "$(COLOR_BLUE)Usage:$(COLOR_RESET) make [target]"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} \
	/^[a-zA-Z_-]+:.*##/ { printf "  $(COLOR_GREEN)%-20s$(COLOR_RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST) | sort
	@echo ""
	@echo "$(COLOR_YELLOW)Note:$(COLOR_RESET) Most targets require 'pnpm install' to have been run first."

##@ Setup

install: ## Install all dependencies (pnpm install)
	pnpm install

db-setup: ## Generate Prisma clients + run migrations + seed both databases
	pnpm --filter @smart-edms/backend db:generate
	pnpm --filter @smart-edms/license-server db:generate
	pnpm --filter @smart-edms/backend db:migrate:deploy
	pnpm --filter @smart-edms/license-server db:migrate:deploy
	@echo ""
	@echo "$(COLOR_GREEN)Database setup complete.$(COLOR_RESET)"
	@echo "Run 'make db-seed' to populate with default data."

db-seed: ## Seed both databases with default data
	pnpm --filter @smart-edms/backend db:seed
	pnpm --filter @smart-edms/license-server db:seed

db-reset: ## ⚠️  Reset databases (drop + recreate + migrate + seed)
	@echo "$(COLOR_YELLOW)This will DROP and recreate all data. Press Ctrl+C to abort...$(COLOR_RESET)"
	@sleep 5
	pnpm --filter @smart-edms/backend db:migrate reset --force
	pnpm --filter @smart-edms/license-server db:migrate reset --force
	pnpm --filter @smart-edms/backend db:seed
	pnpm --filter @smart-edms/license-server db:seed

key-generate: ## Generate the license signing keypair (Ed25519)
	pnpm --filter @smart-edms/license-server key:generate
	@echo ""
	@echo "$(COLOR_GREEN)Signing keypair generated.$(COLOR_RESET)"
	@echo "Private key: ./license-signing-key.pem (chmod 600)"
	@echo "Public key:  copy the printed PEM to infra/docker/license-public-key.pem"

##@ Development

dev: docker-dev-up ## Start dev infrastructure + all apps in watch mode
	pnpm dev

dev-backend: docker-dev-up ## Start only the backend in watch mode
	pnpm --filter @smart-edms/backend dev

dev-electron: ## Start only the Electron client in watch mode
	pnpm --filter @smart-edms/electron dev

dev-license-server: docker-dev-up ## Start only the license server in watch mode
	pnpm --filter @smart-edms/license-server dev

dev-license-admin: ## Start only the license admin panel in watch mode
	pnpm --filter @smart-edms/license-admin dev

dev-marketing: ## Start only the marketing page in watch mode
	pnpm --filter @smart-edms/marketing dev

##@ Build

build: ## Build all packages + apps
	pnpm build

build-packages: ## Build only shared packages
	pnpm --filter './packages/*' build

build-backend: ## Build only the backend
	pnpm --filter @smart-edms/backend build

build-electron: ## Build only the Electron client
	pnpm --filter @smart-edms/electron build

build-electron-installer: ## Build Electron installer (signed)
	pnpm --filter @smart-edms/electron build:electron

build-license-server: ## Build only the license server
	pnpm --filter @smart-edms/license-server build

build-license-admin: ## Build only the license admin panel
	pnpm --filter @smart-edms/license-admin build

build-marketing: ## Build only the marketing page
	pnpm --filter @smart-edms/marketing build

##@ Quality

typecheck: ## Typecheck all packages + apps
	pnpm typecheck

lint: ## Lint all packages + apps
	pnpm lint

format: ## Format all files with Prettier
	pnpm format

format-check: ## Check formatting without writing
	pnpm format:check

i18n-check: ## Validate i18n keys across all locales
	pnpm i18n:check

i18n-extract: ## Extract t() keys from source code
	pnpm i18n:extract

##@ Testing

test: ## Run all unit + integration tests
	pnpm test

test-backend: ## Run backend tests only
	pnpm --filter @smart-edms/backend test

test-license-server: ## Run license server tests only
	pnpm --filter @smart-edms/license-server test

test-packages: ## Run shared package tests only
	pnpm --filter './packages/*' test

e2e: ## Run Playwright E2E tests (requires dev stack running + seeded DB)
	pnpm --filter @smart-edms/electron test:e2e

e2e-ui: ## Run Playwright E2E tests with interactive UI
	pnpm --filter @smart-edms/electron test:e2e:ui

e2e-report: ## Show Playwright E2E test report
	pnpm --filter @smart-edms/electron test:e2e:report

##@ Docker

docker-dev-up: ## Start dev infrastructure (postgres, redis, minio)
	docker compose -f infra/docker/docker-compose.dev.yml up -d
	@echo ""
	@echo "$(COLOR_GREEN)Dev infrastructure started:$(COLOR_RESET)"
	@echo "  PostgreSQL: localhost:5432 (smart_edms / smart_edms_dev)"
	@echo "  Redis:      localhost:6379"
	@echo "  MinIO:      localhost:9000 (console: localhost:9001)"
	@echo ""
	@echo "Run 'make db-setup' to initialize databases."

docker-dev-down: ## Stop dev infrastructure
	docker compose -f infra/docker/docker-compose.dev.yml down

docker-dev-logs: ## Tail dev infrastructure logs
	docker compose -f infra/docker/docker-compose.dev.yml logs -f

docker-prod-up: ## Start full production stack (requires .env configured)
	cd infra/docker && docker compose up -d

docker-prod-down: ## Stop full production stack
	cd infra/docker && docker compose down

docker-prod-logs: ## Tail production stack logs
	cd infra/docker && docker compose logs -f

docker-build: ## Build production Docker images
	docker compose -f infra/docker/docker-compose.yml build

##@ Database Tools

prisma-studio: ## Open Prisma Studio (database GUI) for the backend
	pnpm --filter @smart-edms/backend db:studio

prisma-migrate: ## Create a new backend migration from schema changes
	pnpm --filter @smart-edms/backend db:migrate

prisma-migrate-deploy: ## Apply pending migrations (production)
	pnpm --filter @smart-edms/backend db:migrate:deploy
	pnpm --filter @smart-edms/license-server db:migrate:deploy

opensearch-init: ## Initialize the OpenSearch index with Arabic-aware analyzer
	pnpm --filter @smart-edms/backend opensearch:init

##@ Maintenance

clean: ## Remove build artifacts (dist, .next, coverage)
	@echo "$(COLOR_YELLOW)Removing build artifacts...$(COLOR_RESET)"
	find . -type d -name dist -prune -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .next -prune -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name coverage -prune -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .turbo -prune -exec rm -rf {} + 2>/dev/null || true
	find . -name '*.tsbuildinfo' -delete 2>/dev/null || true
	@echo "$(COLOR_GREEN)Done. Run 'make install' to rebuild.$(COLOR_RESET)"

clean-deep: clean ## ⚠️  Remove build artifacts AND node_modules (full clean)
	@echo "$(COLOR_YELLOW)Removing node_modules...$(COLOR_RESET)"
	find . -type d -name node_modules -prune -exec rm -rf {} + 2>/dev/null || true
	@echo "$(COLOR_GREEN)Done. Run 'make install' to reinstall.$(COLOR_RESET)"

##@ Deployment

deploy-staging: ## Deploy to staging (placeholder — customize for your environment)
	@echo "$(COLOR_YELLOW)Staging deployment not configured.$(COLOR_RESET)"
	@echo "Customize this target in the Makefile for your staging environment."

deploy-production: ## Deploy to production (placeholder — customize for your environment)
	@echo "$(COLOR_YELLOW)Production deployment not configured.$(COLOR_RESET)"
	@echo "Customize this target in the Makefile for your production environment."
	@echo ""
	@echo "See docs/DEPLOYMENT.md for the manual deployment procedure."

rollback: ## Rollback to previous deployment (placeholder)
	@echo "$(COLOR_YELLOW)Rollback not configured.$(COLOR_RESET)"
	@echo "See docs/OPERATIONS_RUNBOOK.md#9-updates-and-rollbacks for the manual rollback procedure."
