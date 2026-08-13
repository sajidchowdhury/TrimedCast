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
    $PHPIZE_DEPS

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql \
        pgsql \
        redis \
        gd \
        zip \
        bcmath \
        mbstring \
        xml \
        curl \
        pcntl \
        opcache

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node.js and npm (for Vite)
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /var/www/html

# Copy composer files first for caching
COPY src/composer.json src/composer.lock* ./

# Install composer dependencies (skip if no lock file yet)
RUN if [ -f composer.lock ]; then composer install --no-dev --no-scripts --no-autoloader --prefer-dist; fi

# Copy full application source
COPY src/ .

# Install composer autoloader
RUN composer dump-autoload --optimize

# Set permissions for Laravel
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/storage \
    && chmod -R 775 /var/www/html/bootstrap/cache

# Expose port 9000 (PHP-FPM)
EXPOSE 9000

CMD ["php-fpm"]
