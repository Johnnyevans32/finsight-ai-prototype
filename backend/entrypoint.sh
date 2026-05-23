#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py seed_categories

exec gunicorn finsight.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 120
