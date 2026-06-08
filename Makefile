.PHONY: e2e-up e2e-down e2e-reset e2e-test e2e-pull-models

COMPOSE_E2E = docker compose -f docker-compose.yml -f docker-compose.e2e.yml

e2e-up:
	$(COMPOSE_E2E) up -d --build

e2e-down:
	$(COMPOSE_E2E) down

e2e-reset:
	$(COMPOSE_E2E) exec -T api python scripts/e2e_reset.py

e2e-pull-models:
	$(COMPOSE_E2E) exec -T ollama ollama pull $(or $(E2E_OLLAMA_MODEL),llama3.2)
	$(COMPOSE_E2E) exec -T ollama ollama pull $(or $(E2E_EMBEDDING_MODEL),nomic-embed-text)

e2e-test: e2e-up
	@echo "Waiting for API health..."
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do \
		curl -sf http://localhost/api/v1/health >/dev/null 2>&1 && break; \
		sleep 2; \
	done
	cd frontend && npm run test:e2e
