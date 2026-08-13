# TrimedCast - Laravel Docker Development Commands (PowerShell)
# Usage: .\dev.ps1 <command>
# Example: .\dev.ps1 setup

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

$COMPOSE = "docker compose"
$APP = "$COMPOSE exec app"
$APP_ROOT = "$COMPOSE exec -u root app"

switch ($Command) {
    # ── Docker Lifecycle ──────────────────────────
    "setup" {
        Write-Host "Building Docker images..." -ForegroundColor Cyan
        docker compose build
        Write-Host "Starting services..." -ForegroundColor Cyan
        docker compose up -d
        Write-Host "Waiting for services to be healthy (10s)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        Write-Host "Installing Composer dependencies..." -ForegroundColor Cyan
        docker compose exec app composer install
        Write-Host "Copying .env if needed..." -ForegroundColor Cyan
        docker compose exec app bash -c "cp -n .env.example .env 2>/dev/null || true"
        Write-Host "Generating app key..." -ForegroundColor Cyan
        docker compose exec app php artisan key:generate --ansi
        Write-Host "Linking storage..." -ForegroundColor Cyan
        docker compose exec app bash -c "php artisan storage:link 2>/dev/null || true"
        Write-Host "Running migrations..." -ForegroundColor Cyan
        docker compose exec app php artisan migrate --force
        Write-Host ""
        Write-Host "TrimedCast is running at http://localhost:8000" -ForegroundColor Green
        Write-Host "Horizon dashboard at http://localhost:8000/horizon" -ForegroundColor Green
        Write-Host "PostgreSQL on localhost:5432" -ForegroundColor Green
        Write-Host "Redis on localhost:6379" -ForegroundColor Green
    }

    "up" {
        docker compose up -d
    }

    "down" {
        docker compose down
    }

    "build" {
        docker compose build
    }

    "ps" {
        docker compose ps
    }

    "restart" {
        docker compose restart
    }

    # ── Laravel Artisan ───────────────────────────
    "migrate" {
        docker compose exec app php artisan migrate
    }

    "fresh" {
        docker compose exec app php artisan migrate:fresh --seed
    }

    "seed" {
        docker compose exec app php artisan db:seed
    }

    "rollback" {
        docker compose exec app php artisan migrate:rollback
    }

    "artisan" {
        $cmd = $args -join " "
        if ($cmd) {
            docker compose exec app php artisan $cmd
        } else {
            Write-Host "Usage: .\dev.ps1 artisan <command>" -ForegroundColor Yellow
            Write-Host 'Example: .\dev.ps1 artisan "migrate:status"' -ForegroundColor Yellow
        }
    }

    # ── Composer & Node ───────────────────────────
    "composer" {
        $cmd = if ($args.Count -gt 0) { $args -join " " } else { "install" }
        docker compose exec app composer $cmd
    }

    "npm-install" {
        docker compose exec app npm install
    }

    "build-assets" {
        docker compose exec app npm run build
    }

    # ── Testing ───────────────────────────────────
    "test" {
        docker compose exec app php artisan test
    }

    # ── Queue & Horizon ───────────────────────────
    "horizon" {
        Write-Host "Horizon dashboard: http://localhost:8000/horizon" -ForegroundColor Green
        docker compose logs -f horizon
    }

    "queue-work" {
        docker compose exec app php artisan queue:work redis --queue=default,forecasts,imports
    }

    # ── Database ──────────────────────────────────
    "psql" {
        docker compose exec postgres psql -U trimedcast -d trimedcast
    }

    # ── Logs ──────────────────────────────────────
    "logs" {
        docker compose logs -f app
    }

    "logs-nginx" {
        docker compose logs -f web
    }

    "logs-all" {
        docker compose logs -f
    }

    # ── Permissions ───────────────────────────────
    "permissions" {
        docker compose exec -u root app chmod -R 775 /var/www/html/storage
        docker compose exec -u root app chmod -R 775 /var/www/html/bootstrap/cache
        docker compose exec -u root app chown -R www-data:www-data /var/www/html/storage
        docker compose exec -u root app chown -R www-data:www-data /var/www/html/bootstrap/cache
        Write-Host "Permissions fixed." -ForegroundColor Green
    }

    # ── Cleanup ───────────────────────────────────
    "clean" {
        docker compose down -v --rmi all
        Write-Host "All containers, volumes, and images removed." -ForegroundColor Yellow
    }

    "clear-cache" {
        docker compose exec app php artisan cache:clear
        docker compose exec app php artisan config:clear
        docker compose exec app php artisan route:clear
        docker compose exec app php artisan view:clear
        Write-Host "All caches cleared." -ForegroundColor Green
    }

    # ── Help (default) ────────────────────────────
    default {
        Write-Host ""
        Write-Host "TrimedCast - Laravel Docker Development Commands" -ForegroundColor Cyan
        Write-Host "=================================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "  setup           Full setup: build, start, install, migrate" -ForegroundColor White
        Write-Host "  up              Start all services" -ForegroundColor White
        Write-Host "  down            Stop all services" -ForegroundColor White
        Write-Host "  build           Build/rebuild Docker images" -ForegroundColor White
        Write-Host "  ps              List running services" -ForegroundColor White
        Write-Host "  restart         Restart all services" -ForegroundColor White
        Write-Host ""
        Write-Host "  migrate         Run migrations" -ForegroundColor White
        Write-Host "  fresh           Fresh migrate with seeds" -ForegroundColor White
        Write-Host "  seed            Run database seeders" -ForegroundColor White
        Write-Host "  rollback        Rollback last migration" -ForegroundColor White
        Write-Host '  artisan         Run artisan (e.g. .\dev.ps1 artisan "migrate:status")' -ForegroundColor White
        Write-Host ""
        Write-Host "  composer        Install composer deps" -ForegroundColor White
        Write-Host "  npm-install     Install npm deps" -ForegroundColor White
        Write-Host "  build-assets    Build Vite assets" -ForegroundColor White
        Write-Host ""
        Write-Host "  test            Run PHPUnit tests" -ForegroundColor White
        Write-Host "  horizon         View Horizon logs" -ForegroundColor White
        Write-Host "  psql            Connect to PostgreSQL" -ForegroundColor White
        Write-Host ""
        Write-Host "  logs            Tail app logs" -ForegroundColor White
        Write-Host "  logs-all        Tail all logs" -ForegroundColor White
        Write-Host "  permissions     Fix storage permissions" -ForegroundColor White
        Write-Host "  clean           Remove all containers + volumes" -ForegroundColor White
        Write-Host "  clear-cache     Clear all Laravel caches" -ForegroundColor White
        Write-Host ""
    }
}
