import { DataSource } from 'typeorm';

import { ProductOutboxService } from '../../../integration/outbox/product-outbox.service';
import { ProductSnapshotService } from '../../../integration/outbox/product-snapshot.service';
import { ProductRepository } from './product.repository';

const createFixture = () => {
  const query = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  const dataSource = {
    getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(query) }),
  } as unknown as DataSource;

  const repository = new ProductRepository(dataSource, {} as ProductOutboxService, {} as ProductSnapshotService);
  return { repository, query };
};

describe('ProductRepository search', () => {
  it('ищет подстроку названия через параметр и сохраняет пагинацию', async () => {
    const { repository, query } = createFixture();
    await repository.getAll(20, 40, undefined, undefined, [], 'май');
    expect(query.andWhere).toHaveBeenCalledWith('product.name ILIKE :term', { term: '%май%' });
    expect(query.take).toHaveBeenCalledWith(20);
    expect(query.skip).toHaveBeenCalledWith(40);
  });

  it('не трактует символы шаблона пользователя как wildcard', async () => {
    const { repository, query } = createFixture();
    await repository.getAll(20, 0, undefined, undefined, [], '%_');
    expect(query.andWhere).toHaveBeenCalledWith('product.name ILIKE :term', { term: '%\\%\\_%' });
  });

  it('без поискового запроса сохраняет прежнюю выборку', async () => {
    const { repository, query } = createFixture();
    await repository.getAll(20, 0);
    expect(query.andWhere).not.toHaveBeenCalled();
  });
});
