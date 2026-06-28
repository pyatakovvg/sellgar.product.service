# @service/product

`service/` - приложение доменного сервиса товарного каталога. Оно владеет товарами,
вариантами, категориями, свойствами, брендами и доменными связями изображений с
вариантами товара.

## Что здесь находится

- `src/main.ts` - RMQ command queue и event queue bootstrap.
- `src/app.module.ts` - `ConfigModule`, PostgreSQL через TypeORM, `ApiV1Module`.
- `src/api/v1/product`, `variant`, `category`, `property`, `property-group`, `brand`, `image` - каталог и его структура.
- `src/api/v1/variant/variant-image.model.ts` - связь изображения с вариантом товара, включая порядок и primary-флаг.
- `@sellgar/outbox` подключается из `library/sellgar.outbox.library` через workspace-зависимость и отвечает за общую механику transactional outbox.

## Правила изменений

- Каталог и его связи изменяйте в сервисе-владельце, а gateway обновляйте как адаптеры внешнего API.
- Товар не владеет изображениями напрямую. Изображения привязываются к варианту через `variant_image`.
- `image` хранит проекцию файла из `file_srv` и использует UUID файла как внешний идентификатор. Байты файла и MinIO принадлежат `services/media_srv`.
- Не сохраняйте `blob:` URL, gateway URL или presigned/public URL в модели каталога.
- Для TypeORM-частей поддерживайте согласованность `model`, `entity`, `repository`, `service`, `controller`.
- Изменения product v1 могут требовать синхронизации с gateway product v2, где внешний контракт может отличаться от внутренней версии.
- При изменении связи variant-image синхронизируйте `gateways/admin/src/api/product_srv/v2/variant` и UI-контракт редактирования варианта.
- `product` и `variant` используют статусный lifecycle (`active`, `archived`, `disabled`);
  значения описаны enum `CatalogStatus` и PostgreSQL enum `catalog_status_enum`.
  Удаление из пользовательского сценария переводит сущность в статус `archived`, увеличивает
  `version` и пишет integration event; физический `DELETE` допустим только для отдельного purge.
- Read/list выборки по status должны исключать только `archived`; `disabled` остается видимым
  состоянием сущности.
- Все update-команды самостоятельных сущностей должны принимать `version`, проверять ее перед
  записью и возвращать `ConflictException` при рассинхроне.
- RMQ queues/exchange берутся из `AMQP_PRODUCT_SRV_COMMAND_QUEUE`, `AMQP_PRODUCT_SRV_EVENT_QUEUE`, `AMQP_EVENTS_EXCHANGE`.
- Доменные события формируйте в коде сервиса, но запись в `outbox_event` выполняйте через `OutboxWriter` и текущий TypeORM `EntityManager`.

## Проверка

Из корня репозитория: `yarn build:product_srv`.
Из `service/`: `yarn build`.
