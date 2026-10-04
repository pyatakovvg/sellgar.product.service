# Image projection

## Границы модуля

```text
image/
  domain/
    image.ts
  application/
    command/
    port/
    query/
    service/
  infrastructure/
    persistence/
      model/
      repository/
  presentation/
    rmq/
      dto/
      image.controller.ts
  image.module.ts
```

`domain` не зависит от NestJS и TypeORM. `application` содержит сценарии,
команды, запросы и абстрактный порт `ImageRepository`. Реализация порта и
TypeORM-модель находятся в `infrastructure`. DTO принадлежат только RMQ-границе;
контроллер преобразует их в application command/query. `image.module.ts`
связывает порт с `TypeOrmImageRepository` и является composition root модуля.

`image.uuid` is the existing UUID of a file. This module stores only `uuid`,
`file_name`, and the projection `version`; it does not generate file IDs, store
bytes, URLs, upload state, or invent an inbox envelope. The existing create and
update event names and direct payload shape are preserved.
Event handlers receive unknown metadata, explicitly project their known fields,
then validate that DTO locally. Thus extra fields from the actual file producer
remain compatible even when command validation globally forbids unknown fields.
The read command remains a strict DTO and uses the Nest `{ cmd: 'catalog.v2.image.getByUuid' }` pattern.

Source contracts inspected:

- `_service/.../image/repository/dto/create-image.dto.ts`: `{ uuid, name }`.
- `_service/.../image/repository/dto/update-image.dto.ts`: добавляет `version`.
- The old image repository compares update `version` to the stored version,
  then increments it. Thus its version denotes the **previous projection
  version**, not the resulting source file version.
- The current file service emits file metadata on CREATE (also after completing
  an upload). Its FileModel has no version; no UPDATE emitter was found there.
  An UPDATE event is supported as the existing legacy contract, not claimed to
  be currently emitted by that service.

Rules:

| Event | Result |
|---|---|
| First CREATE | Insert filename, version 1 |
| Repeated or late CREATE | No overwrite, including after UPDATE |
| UPDATE with previous version N | Candidate projection version N+1 |
| Candidate version greater than stored | Atomically write complete filename and candidate version |
| Candidate version equal to/lower than stored | No-op (duplicate/stale) |
| UPDATE before CREATE | Seed the projection from its complete filename |
| Gap in previous versions | Fast-forward, because the local projection has only the complete filename |

For different payloads with the same candidate version, the first committed
payload wins. No timestamp/source-version ordering is invented for unversioned
CREATE. Conditional PostgreSQL UPSERT performs comparison and mutation together;
there is no read-then-write freshness race.

`catalog.v2.image.getByUuid` возвращает текущие метаданные или NotFound. Связи
Brand и Variant ссылаются на `image.uuid`; Product service не редактирует
метаданные файла своими командами. Модуль экспортирует `ImageService` и
`TypeOrmModule`.

Tests execute the actual repository SQL in a disposable PostgreSQL 16 single-user
cluster. They require the same local PostgreSQL binaries as the constructor SQL
experiment; no running service, broker, or existing database is touched.
