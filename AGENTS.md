# @service/product

`services/product_srv` - доменный сервис товарного каталога. Он владеет товарами,
вариантами, категориями, свойствами, брендами и доменными связями изображений с
вариантами товара.

## Что здесь находится

- `src/main.ts` - RMQ command queue и event queue bootstrap.
- `src/app.module.ts` - `ConfigModule`, PostgreSQL через TypeORM, `ApiV1Module`.
- `src/api/v1/product`, `variant`, `category`, `property`, `property-group`, `brand`, `image` - каталог и его структура.
- `src/api/v1/variant/variant-image.model.ts` - связь изображения с вариантом товара, включая порядок и primary-флаг.
- `src/api/v1/shop`, `store`, `price`, `currency`, `unit`, `user` - legacy/смежные области. Новую логику цен, остатков, магазинов и заказов не расширять здесь без отдельного решения по границе с `services/order_srv`.

## Правила изменений

- Каталог и его связи изменяйте в сервисе-владельце, а gateway обновляйте как адаптеры внешнего API.
- Товар не владеет изображениями напрямую. Изображения привязываются к варианту через `variant_image`.
- `image` хранит проекцию файла из `file_srv` и использует UUID файла как внешний идентификатор. Байты файла и MinIO принадлежат `services/media_srv`.
- Не сохраняйте `blob:` URL, gateway URL или presigned/public URL в модели каталога.
- Для TypeORM-частей поддерживайте согласованность `model`, `entity`, `repository`, `service`, `controller`.
- Изменения product v1 могут требовать синхронизации с gateway product v2, где внешний контракт может отличаться от внутренней версии.
- При изменении связи variant-image синхронизируйте `gateways/admin/src/api/product_srv/v2/variant` и UI-контракт редактирования варианта.
- RMQ queues/exchange берутся из `AMQP_PRODUCT_SRV_COMMAND_QUEUE`, `AMQP_PRODUCT_SRV_EVENT_QUEUE`, `AMQP_EVENTS_EXCHANGE`.

## Проверка

Основная проверка: `yarn workspace @service/product run build`.
