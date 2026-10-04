# Product service v2

Новый NestJS/TypeORM сервис управления каталогом по
[RFC конструктора](../../../../agent/docs/rfc-product-constructor.md). Старая
реализация сохранена целиком в `../_service` и используется только как источник
совместимой инфраструктурной механики.

## Структура

Каждый модуль разделён на транспортную, прикладную и persistence-части:

```text
catalog/<aggregate>/
  controller/
    dto/          один входной контракт на файл
  service/
    command/      команды приложения без class-validator
  repository/     TypeORM и транзакции
  entity/         выходные модели API
  *.model.ts      таблицы агрегата
  *.module.ts     NestJS composition root модуля
```

DTO не используются сервисами и репозиториями. Контроллер валидирует вход и
переводит его в команду приложения. Сервис применяет бизнес-правила, репозиторий
атомарно сохраняет результат и обеспечивает optimistic version check.

## Реализованная модель

- `Unit`, `Brand`, изображения бренда и read-only проекция `Image`.
- `Property` с видами `TEXT`, `INTEGER`, `DECIMAL`, `BOOLEAN`, `DATE`, `OPTIONS`.
- Собственные опции свойства и упорядоченные дополнения `TEXT`, `COLOR`, `IMAGE`.
- `ProductType` с отдельными полями товара и варианта, `required`, `multiple`
  и порядком. `BOOLEAN` всегда одиночный.
- `Product` с ручным кодом, брендом, описанием и минимум одним `Variant`.
- Типизированные значения находятся в дочерних таблицах назначений. `DECIMAL`
  хранится как `numeric(38,12)`, `DATE` как календарная дата, `INTEGER` как bigint.
- Актуальная структура типа формирует выдачу существующего товара. Новое поле
  появляется с пустым массивом значений. Удаление поля каскадно удаляет его
  назначения и значения у товаров или вариантов.
- Товар и вариант имеют состояния `active`/`archived`. Команд физического
  удаления нет; БД дополнительно блокирует `DELETE` триггерами.
- Любая мутация варианта блокирует и увеличивает версию агрегата Product.
  Команды изменения данных проверяют также актуальную версию ProductType.

Категории, ассортимент стора, цены, остатки, резервы и заказы принадлежат Store
и другим сервисам и в этой базе отсутствуют.

## Конфигурация

Рабочий локальный файл `service/.env` создан для базы `product_srv_v2` и
игнорируется Git. Образец без секретов находится в `.env.example`.

```sh
PRODUCT_DATABASE_HOST=127.0.0.1
PRODUCT_DATABASE_PORT=5432
PRODUCT_DATABASE_USERNAME=admin
PRODUCT_DATABASE_PASSWORD=change-me
PRODUCT_DATABASE_NAME=product_srv_v2
PRODUCT_AMQP_URL=amqp://localhost:5672
PRODUCT_V2_COMMAND_QUEUE=product.v2.commands
PRODUCT_V2_EVENT_QUEUE=product.v2.events
PRODUCT_EVENTS_EXCHANGE=event.exchange
```

Старые очереди не используются. Командная и событийная очереди v2 обязаны быть
разными. `synchronize`, автоматический запуск миграций и удаление схемы выключены.

## Запуск и проверка

Из `service`:

```sh
yarn migration:show
yarn migration:run
yarn test --runInBand
yarn start:dev
```

Из корня репозитория:

```sh
yarn build:product_srv
```

На `product_srv_v2` применены четыре миграции. Реальный smoke-сценарий проверен
через TypeORM: создание справочников, типа, товара и варианта одной транзакцией;
появление нового пустого поля; каскад значений после удаления поля; поиск по
числовому диапазону и опции варианта; архивирование; блокировка физического
удаления. После исправления URL из `.env` сервис успешно
подключается к PostgreSQL и обеим RabbitMQ-очередям.

## RMQ-команды

Все команды используют объектный pattern `{ cmd: "..." }`.

| Агрегат | Команды |
|---|---|
| Unit | `catalog.v2.unit.getAll`, `getByCode`, `create`, `update` |
| Brand | `catalog.v2.brand.getAll`, `getByCode`, `create`, `update` |
| Image | `catalog.v2.image.getByUuid`; события `file_srv.file.create/update` |
| Property | `catalog.v2.property.getAll`, `getByCode`, `create`, `update`, `option.create`, `option.update` |
| ProductType | `catalog.v2.productType.getAll`, `getByUuid`, `create`, `update` |
| Product | `catalog.v2.product.getAll`, `getByCode`, `create`, `update`, `archive`, `restore` |
| Variant | `catalog.v2.product.variant.create`, `update`, `archive`, `restore` |

`getAll` принимает `limit` и `offset`; для Product дополнительно доступны фильтры
`status`, `typeUuid` и массив `filters` по значениям свойств. Каждый фильтр задаёт
уровень `PRODUCT` или `VARIANT`, `propertyCode` и критерий, соответствующий виду
свойства: точный текст, boolean, диапазон integer/decimal/date либо набор кодов
опций. Фильтры объединяются через AND; OPTION-коды проверяются по справочнику
конкретного свойства. Создание Product принимает текущую `typeVersion`, свойства
товара и непустой массив `variants`. Каждое назначение выглядит как
`{ propertyCode, values: [...] }`; в каждой строке `values` заполнено ровно одно
поле `valueText`, `valueInteger`, `valueDecimal`, `valueBoolean`, `valueDate` или
`valueOptionCode`.

`catalog.v2.productType.update` изменяет агрегат типа целиком и принимает `uuid`,
`version`, опциональное `name`, `productFields` и `variantFields`. Пропущенный
массив полей не изменяется. Переданный массив является новым полным составом
соответствующего уровня: новые свойства добавляются, общие обновляются, а
отсутствующие удаляются вместе со значениями наследников через FK CASCADE. Всё
изменение выполняется одной транзакцией и увеличивает версию типа один раз.

Обновления свойств являются явными точечными изменениями. Пропущенное назначение
не меняется. Пустой `values` очищает необязательное свойство; обязательное поле
очистить нельзя. Отсутствие варианта в запросе не архивирует его.

Исходящие события каталога пока не публикуются: общая outbox-библиотека хранит
`aggregate_uuid` как UUID, а Product и Variant по RFC имеют строковые бизнес-коды.
Перед подключением Store требуется изменить контракт вложенной outbox-библиотеки
или утвердить отдельную таблицу событий v2.
