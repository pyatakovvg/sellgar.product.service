# sellgar.product.service

Этот репозиторий устроен как небольшая monorepo-зона конкретного сервиса.

## Структура

- `service/` - приложение `@service/product`, источник истины для каталога
  товаров и вариантов.
- `library/sellgar.outbox.library/` - nested submodule с общей библиотекой
  `@sellgar/outbox`.

## Правила

- Код приложения меняйте в `service/`.
- Инфраструктурную механику transactional outbox развивайте в
  `library/sellgar.outbox.library/`.
- Не подключайте общие библиотеки через внешние `file:` пути. Внутренние
  зависимости сервиса должны резолвиться через workspaces и обычную версию
  пакета, например `"@sellgar/outbox": "0.0.1"`.
- Перед изменениями приложения читайте `service/AGENTS.md`.
- Перед изменениями библиотеки читайте
  `library/sellgar.outbox.library/AGENTS.md`.

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
