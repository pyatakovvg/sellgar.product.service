# sellgar.product.service

Этот репозиторий устроен как небольшая monorepo-зона конкретного сервиса.

## Структура

- `code/service/` - приложение `@service/product`, источник истины для каталога
  товаров и вариантов.
- `code/_service/` - сохраненная старая реализация; reference для нового приложения,
  исключена из workspaces. Не изменять ее логику при разработке нового сервиса.
- `code/library/sellgar.outbox.library/` - nested submodule с общей библиотекой
  `@sellgar/outbox`.

## Правила

- Код приложения меняйте в `code/service/`.
- Целевые правила нового приложения определяет RFC конструктора в workspace
  `agent/docs/rfc-product-constructor.md`; план замены — `REWRITE-CONTRACT.md`.
- Инфраструктурную механику transactional outbox развивайте в
  `code/library/sellgar.outbox.library/`.
- Не подключайте общие библиотеки через внешние `file:` пути. Внутренние
  зависимости сервиса должны резолвиться через workspaces и обычную версию
  пакета, например `"@sellgar/outbox": "0.0.1"`.
- Перед изменениями приложения читайте `code/service/AGENTS.md`.
- Перед изменениями библиотеки читайте
  `code/library/sellgar.outbox.library/AGENTS.md`.

## Деплой

- Рабочая ветка — `development`, выпуск — `master`; новые ветки без запроса не создавать.
- Исходники, Yarn и зависимости находятся в `code/`; команды ниже выполнять оттуда.
- В корне находятся Dockerfile, `.github/` и `helm/`. Values приложения и
  ConfigMap `.env` принадлежат этому репозиторию; общий chart — infrastructure.
- Внутренний HTTP `GET /health` на `PORT` (default 8080) проверяет PostgreSQL и
  оба RMQ consumer: commands/events. Наружу сервис не публикуется.
- CI выполняет build образов на Node 24 → publish → параллельные test/migrate
  → deploy. Test запускает существующие Jest-тесты с временным PostgreSQL 16;
  migrate работает с БД выбранной среды. Deploy зависит от обеих jobs.
- На PR без публикации выполняется build → tests; release/* запускает tests
  после publish. Prod принимает только кандидата с успешным CI целиком.
- Runtime содержит только production dependencies, compiled service и outbox;
  PostgreSQL присутствует только в проверочном этапе сборки.
- Docker targets `application` и `migration` используют общую проверенную сборку.
  Первый не содержит migrations/CLI DataSource; второй выполняет TypeORM CLI без
  старта Nest. Docker target tests запускается отдельно от сборки образов.
  GitHub Release хранит release.json
  с обоими digest, source SHA и chart SHA. Prod принимает тег кандидата и
  продвигает ту же пару без сборки.
- Доставка вызывает общий reusable workflow infrastructure: migrate → deploy.
  Команды Kubernetes/Helm находятся прямо в jobs; delivery Python/scripts и
  сгенерированные per-release Helm-пакеты Product не использует.
- Application `.env` — отдельный immutable ConfigMap версии выпуска. Миграция
  использует собственный ConfigMap и не меняет конфигурацию работающего pod.
- Runner и передача ресурсов из Argo в Helm настраиваются до включения CI.
  Порядок: infrastructure `docs/product-delivery.md`. Автоматический реверс
  миграций не реализуется.
- Секреты приходят из Kubernetes Secret, `.env` — из ConfigMap. Не включать
  локальные `.env`, credentials и данные в Git/образ.

## Проверка

```bash
yarn build:product_srv
```

Для изменений, затрагивающих события каталога, дополнительно проверяйте E2E:

```text
admin UI -> admin gateway -> product_srv -> outbox_event -> RabbitMQ -> store_srv.inbox_event -> variant_snapshot/product_snapshot
```

Минимальный ручной сценарий: открыть карточку товара в admin UI, добавить
вариант, сохранить, затем проверить `product_srv.outbox_event`,
`store_srv.inbox_event` и `store_srv.variant_snapshot`.
