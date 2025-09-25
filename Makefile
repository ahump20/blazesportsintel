.PHONY: dev build lint test docker-up

dev:
	./scripts/dev.sh

build:
	npm run build:web

lint:
	npm run lint --workspace apps/web

test:
	npm run build --workspace apps/web

docker-up:
	docker compose up -d --build
