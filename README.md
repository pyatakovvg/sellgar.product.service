# Product service

Каталог товаров, вариантов, брендов, свойств, единиц измерения и типов товаров.
Исходники: `code/service`, общая outbox-библиотека: `code/library/sellgar.outbox.library`.
Старая реализация сохранена в `code/_service` и не входит в сборку.

## Проверка

Из `code/`: `yarn build:product_srv` и `yarn workspace @service/product test --runInBand`.
Тесты проекций изображений используют временный PostgreSQL 16+ (`PG_BIN` или
`pg_config`); тесты FTS запускаются отдельно с `PRODUCT_SEARCH_DATABASE_TESTS=1`.
Dockerfile выполняет обычный набор тестов в отдельном этапе PostgreSQL 16.

Из корня: `docker build -t sellgar-product:check .`, затем
`python3 .github/scripts/smoke-image.py sellgar-product:check`.
Smoke использует только временные контейнеры/БД и проверяет повторные миграции,
RMQ CRUD/search, варианты/изображения, inbox, упорядоченные outbox snapshots,
non-root/read-only runtime и отказ readiness после потери RabbitMQ.

## CI и среды

`development` → build/test/smoke → GHCR; `release/*` — выпуск, production workflow
запускается вручную и использует проверенный digest без повторной сборки.
Argo CD закрепляет chart, Helm values и digest в infrastructure.

`helm/values.app.yaml` содержит общие параметры. `helm/dev/values.yaml` содержит
одну реплику и ConfigMap `.env`; prod values должны быть заполнены при подключении
prod. Общие Kubernetes templates принадлежат infrastructure/chart application.

Секреты `product-database` и `rabbitmq-default-user` передаются через env refs.
`PRODUCT_AMQP_URL` собирается Kubernetes из ранее определённых secret env-полей;
его значение не попадает в ConfigMap или образ. Учетная запись/БД — `product_srv_v2`.
Миграционный Job: `node --env-file=.env node_modules/typeorm/cli.js -d
service/dist/database/data-source.js migration:run`. Synchronize отключён.

Внутренние Service/container: 8080; `GET /health` проверяет БД и оба consumer.
Доменные команды — `product.v2.commands`, File events — `product.v2.events`,
exchange — `event.exchange`. Внешнего Ingress нет: API обслуживает Admin gateway.
Подробности бизнес-контрактов: `code/service/README.md`, `REWRITE-CONTRACT.md`.
