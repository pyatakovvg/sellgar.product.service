# Product service

Каталог товаров, вариантов, брендов, свойств, единиц измерения и типов товаров.
Исходники: `code/service`, общая outbox-библиотека: `code/library/sellgar.outbox.library`.
Старая реализация сохранена в `code/_service` и не входит в сборку.

## Проверка

Из `code/`: `yarn build:product_srv` и `yarn workspace @service/product test --runInBand`.
Тесты проекций изображений используют временный PostgreSQL 16+ (`PG_BIN` или
`pg_config`); тесты FTS запускаются отдельно с `PRODUCT_SEARCH_DATABASE_TESTS=1`.
При доставке CI запускает существующие Jest-тесты отдельной job `test`,
параллельно `migrate`, после публикации образов. Deploy ждёт обеих jobs.
Docker target `tests` содержит PostgreSQL 16 для проверок persistence и миграций.
Сами тесты остаются в `code/service/src`; сборка образов их не запускает.

Из корня:

```bash
docker build --target application -t sellgar-product:application .
docker build --target migration -t sellgar-product:migration .
docker build --target tests --progress plain .
```
Тесты используют временный PostgreSQL; dev/prod базы им не нужны.

## CI и доставка

`ci.yml` запускается только на push в development. В его графе только пять
выполняемых jobs: build, publish, test, migrate, deploy.
`checks.yml` обслуживает PR и push в release/*; в dev-запуск он не входит.
Общая сборка и публикация определены один раз в reusable `build-service.yml`
репозитория infrastructure. Тесты и миграция доставки — в `deliver-service.yml`.

`development`: build → publish → delivery/[test | migrate] → delivery/deploy.
`release/*`: build → publish → tests; кандидат допускается к prod только после
успешного CI целиком. PR выполняет build → tests, без публикации и миграций.
После merge release в master кнопка `Release to production` принимает тег кандидата,
проверяет его исходники и образы и вызывает тот же delivery workflow для prod:
test и migrate параллельно, затем deploy.
Обратный PR master → development создаётся только после успешной доставки.
Проверка ветки master требует обычного merge commit, а не squash/rebase.

Два Docker target остаются: `application` запускает Nest без migrations/CLI
DataSource, `migration` выполняет TypeORM CLI и завершает процесс. Build передаёт
образы publish через artifact; публикация ждёт build и проверяет image IDs.
Уникальные image tags включают source SHA, run ID и attempt. Runtime использует
только digest. Release asset `release.json` сохраняет source/chart revisions,
оба digest и CI run. Для кандидатов включается GitHub immutable releases.

Helm values принадлежат сервису: `helm/values.app.yaml` и `helm/dev|prod/values.yaml`.
Общие templates и reusable build/delivery workflows принадлежат infrastructure.
Chart checkout при build закрепляется SHA в кандидате, values берутся из source SHA.
Workflow и checkout chart закреплены версией `delivery-v0.5.2` infrastructure;
сначала публикуется этот immutable release/tag, затем Product. Тег не перемещается.
Собственных Python-скриптов в CI и доставке Product нет. Отдельная RMQ/Docker
smoke-цепочка удалена; под другим именем она не переносится.

`.env` приложения монтируется из immutable ConfigMap конкретного выпуска;
предыдущие версии сохраняются для ещё работающих pod. У migration Job собственный
ConfigMap. Credentials поступают через Secret refs, а не через GitHub build jobs.
Secret names: `product-database`, `rabbitmq-default-user`, registry `ghcr-pull`.
Database/user: `product_srv_v2`. В prod эти ресурсы создаются отдельно в sellgar-prod;
наличие prod values не означает, что production уже развёрнут.

Миграция получает только DB secret refs, backoffLimit 0 и deadline 600 секунд.
Ошибка тестов или migration Job блокирует deploy. Успешная миграция остаётся
применённой при ошибке параллельных тестов. Cancel workflow не удаляет выполняющуюся миграцию;
следующий запуск отказывается стартовать поверх активной Job. Незавершённая Helm
operation также требует проверки оператором до retry. Никакого автоматического
реверса миграций нет. Миграции при Nest startup отключены.

Первое включение требует self-hosted runner `sellgar-dev` и передачи Product из
Argo в Helm без удаления ресурсов. Все действия и ограничения описаны в
infrastructure `docs/product-delivery.md` и `bootstrap/runner/README.md`.
Другие сервисы продолжают существующую Argo/OCI доставку.

В dev 21 ноября 2026 установлен официальный repository runner
`sellgar-product-dev`: отдельный пользователь `product-runner`, systemd-служба,
доступ Kubernetes только к `sellgar-dev`. Product передан от Argo CD к Helm с
сохранением работающего сервиса и данных. Runner запускается вместе с VM;
порядок обслуживания и обновления его сертификата находится в руководстве
infrastructure `bootstrap/runner/README.md`.

Внутренние Service/container: 8080. `GET /health` проверяет БД и оба RMQ consumer.
Readiness HTTP не управляет доставкой RabbitMQ-команд; отсутствие потерь при
rollout не обещается без отдельной проверки транспорта. Бизнес-контракты:
`code/service/README.md`, `REWRITE-CONTRACT.md`.
