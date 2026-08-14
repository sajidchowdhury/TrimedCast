.PHONY: help setup up down build migrate fresh seed reset artisan composer test horizon logs ps restart

COMPOSE = docker compose
APP = $(COMPOSE) exec app
APP_ROOT = $(COMPOSE) exec -u root app

# ──────────────────────────────────────────────
#  Default target
# ──────────────────────────────────────────────
help: ## Show this help message
	@echo ""
	@echo "TrimedCast - Laravel Docker Development Commands"
	@echo "================================================"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ──────────────────────────────────────────────
#  Docker Lifecycle
# ──────────────────────────────────────────────
setup: ## Full setup: build, start, install deps, migrate
	$(COMPOSE) build
	$(COMPOSE) up -d
	@echo "Waiting for services to be healthy..."
	@sleep 5
	$(COMPOSE) exec app composer install
	$(COMPOSE) exec app cp -n .env.example .env || true
	$(COMPOSE) exec app php artisan key:generate --ansi
	$(COMPOSE) exec app php artisan storage:link || true
	$(COMPOSE) exec app php artisan migrate --force
	@echo ""
	@echo "✓ TrimedCast is running at http://localhost:8000"

up: ## Start all services
	$(COMPOSE) up -d

down: ## Stop all services
	$(COMPOSE) down

build: ## Build/rebuild Docker images
	$(COMPOSE) build

ps: ## List running services
	$(COMPOSE) ps

restart: ## Restart all services
	$(COMPOSE) restart

# ──────────────────────────────────────────────
#  Laravel Artisan
# ──────────────────────────────────────────────
artisan: ## Run artisan command (usage: make artisan cmd="migrate")
	$(APP) php artisan $(cmd)

migrate: ## Run migrations
	$(APP) php artisan migrate

fresh: ## Fresh migrate with seeds
	$(APP) php artisan migrate:fresh --seed

seed: ## Run database seeders
	$(APP) php artisan db:seed

rollback: ## Rollback last migration batch
	$(APP) php artisan migrate:rollback

reset: ## Reset and re-run all migrations
	$(APP) php artisan migrate:reset
	$(APP) php artisan migrate

# ──────────────────────────────────────────────
#  Composer & Node
# ──────────────────────────────────────────────
composer: ## Run composer command (usage: make composer cmd="require package")
	$(APP) composer $(cmd)

install: ## Install composer dependencies
	$(APP) composer install

npm: ## Run npm command (usage: make npm cmd="run build")
	$(COMPOSE) exec app npm $(cmd)

npm-install: ## Install npm dependencies
	$(COMPOSE) exec app npm install

build-assets: ## Build frontend assets with Vite
	$(COMPOSE) exec app npm run build

dev-assets: ## Run Vite dev server
	$(COMPOSE) exec app npm run dev

# ──────────────────────────────────────────────
#  Testing & Code Quality
# ──────────────────────────────────────────────
test: ## Run PHPUnit tests
	$(APP) php artisan test

test-coverage: ## Run tests with coverage
	$(APP) php artisan test --coverage

pint: ## Run Laravel Pint code formatter
	$(APP) ./vendor/bin/pint

pint-test: ## Test Pint formatting without changes
	$(APP) ./vendor/bin/pint --test

# ──────────────────────────────────────────────
#  Queue & Horizon
# ──────────────────────────────────────────────
horizon: ## Access Horizon dashboard (check logs)
	@echo "Horizon dashboard: http://localhost:8000/horizon"
	$(COMPOSE) logs -f horizon

horizon-pause: ## Pause Horizon
	$(COMPOSE) exec horizon php artisan horizon:pause

horizon-continue: ## Resume Horizon
	$(COMPOSE) exec horizon php artisan horizon:continue

horizon-status: ## Check Horizon status
	$(COMPOSE) exec horizon php artisan horizon:status

queue-work: ## Run queue worker manually
	$(APP) php artisan queue:work redis --queue=default,forecasts,imports

queue-retry: ## Retry all failed jobs
	$(APP) php artisan queue:retry all

# ──────────────────────────────────────────────
#  Database
# ──────────────────────────────────────────────
psql: ## Connect to PostgreSQL
	$(COMPOSE) exec postgres psql -U trimedcast -d trimedcast

db-dump: ## Dump database
	$(COMPOSE) exec postgres pg_dump -U trimedcast trimedcast > dump_$$(date +%Y%m%d_%H%M%S).sql

# ──────────────────────────────────────────────
#  Logs & Debugging
# ──────────────────────────────────────────────
logs: ## Tail app logs
	$(COMPOSE) logs -f app

logs-nginx: ## Tail nginx logs
	$(COMPOSE) logs -f web

logs-all: ## Tail all service logs
	$(COMPOSE) logs -f

logs-horizon: ## Tail Horizon logs
	$(COMPOSE) logs -f horizon

# ──────────────────────────────────────────────
#  Permissions
# ──────────────────────────────────────────────
permissions: ## Fix storage permissions
	$(APP_ROOT) chmod -R 775 /var/www/html/storage
	$(APP_ROOT) chmod -R 775 /var/www/html/bootstrap/cache
	$(APP_ROOT) chown -R www-data:www-data /var/www/html/storage
	$(APP_ROOT) chown -R www-data:www-data /var/www/html/bootstrap/cache

# ──────────────────────────────────────────────
#  Cleanup
# ──────────────────────────────────────────────
clean: ## Remove containers, volumes, and images
	$(COMPOSE) down -v --rmi all
	@echo "All containers, volumes, and images removed."

clear-cache: ## Clear all Laravel caches
	$(APP) php artisan cache:clear
	$(APP) php artisan config:clear
	$(APP) php artisan route:clear
	$(APP) php artisan view:clear
	@echo "All caches cleared."
