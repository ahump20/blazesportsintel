.PHONY: dev build test lint format docker-up

dev:
	./scripts/dev.sh

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

format:
	pnpm format

docker-up:
	docker compose up -d --build
