#!/bin/sh
set -e

echo "Running migrations..."
python manage.py migrate --noinput || true

echo "Creating logs directory..."
mkdir -p logs

echo "Starting Gunicorn..."
exec gunicorn finsight.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
