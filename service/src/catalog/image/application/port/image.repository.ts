import { Image } from '../../domain/image';

export abstract class ImageRepository {
  abstract insertIfAbsent(image: Image): Promise<void>;
  abstract upsertIfNewer(image: Image): Promise<void>;
  abstract findByUuid(uuid: string): Promise<Image | null>;
}
