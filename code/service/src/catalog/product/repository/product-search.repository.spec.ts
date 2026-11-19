import { DataSource } from 'typeorm';

import { ProductOutboxService } from '../../../integration/outbox/product-outbox.service';
import { ProductSnapshotService } from '../../../integration/outbox/product-snapshot.service';
import { ProductRepository } from './product.repository';

const createFixture = () => {
  const query = {
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
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
  it('применяет FTS и ранжирование, сохраняя пагинацию', async () => {
    const { repository, query } = createFixture();
    await repository.getAll(20, 40, undefined, undefined, [], 'май');
    expect(query.andWhere).toHaveBeenCalledWith('product.search_vector @@ product_search_query(:term)', {
      term: 'май',
    });
    expect(query.orderBy).toHaveBeenCalledWith('search_rank', 'DESC');
    expect(query.addOrderBy).toHaveBeenCalledWith('product.uuid', 'ASC');
    expect(query.take).toHaveBeenCalledWith(20);
    expect(query.skip).toHaveBeenCalledWith(40);
  });

  it('передает специальный ввод как параметр, без интерполяции в SQL', async () => {
    const { repository, query } = createFixture();
    await repository.getAll(20, 0, undefined, undefined, [], '%_');
    expect(query.andWhere).toHaveBeenCalledWith('product.search_vector @@ product_search_query(:term)', { term: '%_' });
  });

  it('без поискового запроса сохраняет прежнюю выборку', async () => {
    const { repository, query } = createFixture();
    await repository.getAll(20, 0);
    expect(query.andWhere).not.toHaveBeenCalled();
    expect(query.addSelect).not.toHaveBeenCalled();
    expect(query.orderBy).toHaveBeenCalledWith('product.uuid', 'ASC');
  });
});
