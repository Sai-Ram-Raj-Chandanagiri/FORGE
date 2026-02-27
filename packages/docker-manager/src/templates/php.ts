export function phpDockerfile(framework?: string, port?: number): string {
  const exposedPort = port || 8080;

  if (framework === "laravel") {
    return `FROM php:8.3-fpm-alpine
RUN apk add --no-cache nginx supervisor curl
RUN docker-php-ext-install pdo pdo_mysql
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts
COPY . .
RUN php artisan config:cache 2>/dev/null || true
EXPOSE ${exposedPort}
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=${exposedPort}"]`;
  }

  return `FROM php:8.3-apache
RUN docker-php-ext-install pdo pdo_mysql
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY composer.json composer.lock* ./
RUN composer install --no-dev --optimize-autoloader 2>/dev/null || true
COPY . .
EXPOSE ${exposedPort}
CMD ["apache2-foreground"]`;
}
