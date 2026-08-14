FROM php:8.3-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    postgresql-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    libxml2-dev \
    oniguruma-dev \
    curl \
    git \
    linux-headers \
    bash \
    $PHPIZE_DEPS

# Install PHP extensions (redis via PECL, not docker-php-ext-install)
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pgsql \
        gd \
        zip \
        bcmath \
        mbstring \
        xml \
        curl \
        pcntl \
        opcache \
    && pecl install redis \
    && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node.js and npm (for Vite)
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /var/www/html

# Copy application source
COPY src/ .

# Install composer dependencies (if composer.json exists)
RUN if [ -f composer.json ]; then composer install --no-dev --no-scripts --no-autoloader --prefer-dist || true; fi

# Install composer autoloader
RUN if [ -f vendor/autoload.php ]; then composer dump-autoload --optimize; fi

# Create required directories if they don't exist
RUN mkdir -p storage/logs \
    && mkdir -p storage/framework/sessions \
    && mkdir -p storage/framework/views \
    && mkdir -p storage/framework/cache \
    && mkdir -p storage/app/public \
    && mkdir -p bootstrap/cache

# Set permissions for Laravel
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/storage \
    && chmod -R 775 /var/www/html/bootstrap/cache

# Expose port 9000 (PHP-FPM)
EXPOSE 9000

CMD ["php-fpm"]
