import { NotFoundException } from '@nestjs/common';

import { Image } from '../../domain/image';
import { CreateImageCommand } from '../command/create-image.command';
import { UpdateImageCommand } from '../command/update-image.command';
import { ImageRepository } from '../port/image.repository';
import { GetImageQuery } from '../query/get-image.query';
import { ImageService } from './image.service';

const imageUuid = '11111111-1111-4111-8111-111111111111';

describe('ImageService', () => {
  const repository = {
    insertIfAbsent: jest.fn(),
    upsertIfNewer: jest.fn(),
    findByUuid: jest.fn(),
  };
  const service = new ImageService(repository as unknown as ImageRepository);

  beforeEach(() => jest.clearAllMocks());

  it('projects CREATE as the initial domain version', async () => {
    await service.create(new CreateImageCommand(imageUuid, 'shirt.png'));

    expect(repository.insertIfAbsent).toHaveBeenCalledWith(new Image(imageUuid, 'shirt.png', 1));
  });

  it('converts the source previous version into the next projection version', async () => {
    await service.update(new UpdateImageCommand(imageUuid, 'renamed.png', 4));

    expect(repository.upsertIfNewer).toHaveBeenCalledWith(new Image(imageUuid, 'renamed.png', 5));
  });

  it('returns the projected file metadata', async () => {
    const image = new Image(imageUuid, 'shirt.png', 3);
    repository.findByUuid.mockResolvedValue(image);

    await expect(service.getByUuid(new GetImageQuery(imageUuid))).resolves.toEqual(image);
    expect(repository.findByUuid).toHaveBeenCalledWith(imageUuid);
  });

  it('reports a missing projection', async () => {
    repository.findByUuid.mockResolvedValue(null);

    await expect(service.getByUuid(new GetImageQuery(imageUuid))).rejects.toBeInstanceOf(NotFoundException);
  });
});
