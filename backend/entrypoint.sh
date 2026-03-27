#!/bin/sh
set -e

# Only run migrations when starting the API server (not celery workers)
if echo "$@" | grep -q "uvicorn"; then
    echo "Running database migrations..."
    alembic upgrade head
fi

echo "Starting: $@"
exec "$@"
