import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { FileCreatedEventDto } from './file-created-event.dto';
import { FileUpdatedEventDto } from './file-updated-event.dto';

const imageUuid = '11111111-1111-4111-8111-111111111111';

describe('File image event DTOs', () => {
  it('accepts the existing unversioned CREATE event and strips unrelated metadata', async () => {
    const dto = plainToInstance(FileCreatedEventDto, {
      uuid: imageUuid,
      name: 'shirt.png',
      mime: 'image/png',
      storageKey: 'not-catalog-data',
    });

    expect(await validate(dto, { whitelist: true })).toEqual([]);
    expect(dto).toEqual({ uuid: imageUuid, name: 'shirt.png' });
  });

  it('strips unrelated file metadata at the Nest boundary', async () => {
    const event = {
      uuid: imageUuid,
      name: 'shirt.png',
      mime: 'image/png',
      storageKey: 'outside-catalog',
      status: 'ready',
      size: 200,
      folderUuid: null,
      createdAt: '2026-10-04',
    };
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    await expect(pipe.transform(event, { type: 'body', metatype: FileCreatedEventDto })).resolves.toEqual({
      uuid: imageUuid,
      name: 'shirt.png',
    });
  });

  it('rejects malformed known event fields', async () => {
    const pipe = new ValidationPipe({ whitelist: true, transform: true });

    await expect(
      pipe.transform(
        { uuid: imageUuid, name: 'shirt.png', version: '1' },
        { type: 'body', metatype: FileUpdatedEventDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform(
        { uuid: 'not-a-uuid', name: 'shirt.png', storageKey: 'ignored' },
        { type: 'body', metatype: FileCreatedEventDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([undefined, 0, -1, 1.5, 2147483647])('rejects invalid previous UPDATE version: %s', async (version) => {
    const dto = plainToInstance(FileUpdatedEventDto, { uuid: imageUuid, name: 'shirt.png', version });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'version')).toBe(true);
  });
});
