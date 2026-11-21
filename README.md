# Product service

Каталог товаров, вариантов, брендов, свойств, единиц измерения и типов товаров.
Исходники: `code/service`, общая outbox-библиотека: `code/library/sellgar.outbox.library`.
Старая реализация сохранена в `code/_service` и не входит в сборку.

## Проверка

Из `code/`: `yarn build:product_srv` и `yarn workspace @service/product test --runInBand`.
Тесты проекций изображений используют временный PostgreSQL 16+ (`PG_BIN` или
`pg_config`); тесты FTS запускаются отдельно с `PRODUCT_SEARCH_DATABASE_TESTS=1`.
Dockerfile выполняет обычный набор тестов в отдельном этапе PostgreSQL 16.

Из корня:

```bash
docker build --target application -t sellgar-product:application .
docker build --target migration -t sellgar-product:migration .
python3 -B .github/scripts/smoke-image.py sellgar-product:application sellgar-product:migration
```
Smoke использует только временные контейнеры/БД и проверяет повторные миграции,
RMQ CRUD/search, варианты/изображения, inbox, упорядоченные outbox snapshots,
non-root/read-only runtime и отказ readiness после потери RabbitMQ.

## CI и среды

`development` → build/test/smoke → GHCR; `release/*` — выпуск, production workflow
запускается вручную и использует два проверенных digest без повторной сборки.
Одна сборка исходников обслуживает два Docker target. Образ `application` запускает
Nest и не содержит каталога миграций или CLI DataSource. Образ `migration` содержит
скомпилированные миграции, DataSource, его модели и runtime-зависимости; его CMD
выполняет TypeORM CLI и завершает процесс. Nest-сервер в этой Job не запускается.
Оба образа публикуются в один GHCR repository с тегами `sha-<commit>` и
`sha-<commit>-migration`. Release manifest v2 и Helm OCI-пакет закрепляют оба digest
из одного source commit; выпуск пакета возможен только после smoke всей пары.
Argo CD отслеживает пакеты среды; инфраструктурный Git не меняется на каждый релиз.

`helm/values.app.yaml` содержит общие параметры. `helm/dev/values.yaml` содержит
одну реплику и ConfigMap `.env`; prod values должны быть заполнены при подключении
prod. Общие Kubernetes templates принадлежат infrastructure/chart application.

Секреты `product-database` и `rabbitmq-default-user` передаются через env refs.
`PRODUCT_AMQP_URL` собирается Kubernetes из ранее определённых secret env-полей;
его значение не попадает в ConfigMap или образ. Учетная запись/БД — `product_srv_v2`.
Миграционный Job использует CMD образа: `node --env-file=.env node_modules/typeorm/cli.js -d
service/dist/database/data-source.js migration:run`. Synchronize отключён.
ConfigMap применяется в Sync wave -2, Job — -1, Deployment — 0. Job получает только
DB secret refs, завершается с кодом 0 до обновления Deployment; ошибка блокирует
раскатку. Лимит выполнения — 600 секунд, Job не повторяет неуспешный Pod.
Повторы всей синхронизации задаются отдельно retry-политикой Argo CD Application.
Результат и логи Job доступны до следующего Sync или 24 часа после завершения.
Приложение и миграция пока используют существующую DB-роль; разделение прав
DDL/DML требует отдельного изменения владельцев объектов и Secrets.

Prod workflow принимает только новый manifest v2 с обоими образами. Для старого
кандидата с manifest v1 нужно заново выполнить CI release-ветки.
Обновлённый delivery action/chart публикуется первым, затем его Git SHA закрепляется
в `ci.yml` и `production.yml` Product. Другие сервисы сохраняют текущую доставку.

Внутренние Service/container: 8080; `GET /health` проверяет БД и оба consumer.
Доменные команды — `product.v2.commands`, File events — `product.v2.events`,
exchange — `event.exchange`. Внешнего Ingress нет: API обслуживает Admin gateway.
Подробности бизнес-контрактов: `code/service/README.md`, `REWRITE-CONTRACT.md`.
