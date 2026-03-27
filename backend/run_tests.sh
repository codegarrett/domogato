#!/bin/bash
# Run backend tests against the Docker-hosted test database
export DATABASE_URL="postgresql+asyncpg://projecthub:secret@localhost:5434/projecthub"
export REDIS_URL="redis://localhost:6381/0"

cd "$(dirname "$0")"
python -m pytest tests/ "$@"
