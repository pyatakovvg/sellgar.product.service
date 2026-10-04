# @service/product

Приложение `product_srv` внутри service-local monorepo
`sellgar.product.service`.

## Зона ответственности

`product_srv` является источником истины для каталога:

- product;
- variant;
- brand;
- category;
- property/property group;
- unit;
- image projection и связи `variant_image`.

Сервис не владеет магазинами, продажными предложениями, ценами, остатками,
резервами, корзиной и заказами.

## События

Изменения product/variant пишутся в `outbox_event` через `@sellgar/outbox`.
Событие должно записываться в той же транзакции, что и доменное изменение.

Текущий внешний контур:

```text
product_srv.outbox_event -> RabbitMQ event.exchange -> store_srv.inbox_event -> *_snapshot
```

## Проверка

Из корня `sellgar.product.service`:

```bash
yarn build:product_srv
```

Для runtime-проверки после изменений событий: запустить product/store/gateway/admin
UI, добавить вариант товара через UI и проверить, что `variant.created` дошел до
`store_srv.variant_snapshot`.
